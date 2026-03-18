import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createDeliveryAssignments } from "@/lib/dispatch/auto-assign";

async function generateProjectNumber(): Promise<string> {
  const supabase = getSupabaseAdminClient() as any;
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .gte("created_at", `${year}-01-01T00:00:00Z`);
  const seq = ((count ?? 0) + 1).toString().padStart(4, "0");
  return `PRJ-${year}-${seq}`;
}

async function logProjectActivity(
  projectId: string,
  activityType: string,
  description: string,
  metadata: Record<string, any> = {},
  createdBy?: string,
) {
  const supabase = getSupabaseAdminClient() as any;
  await supabase.from("project_activity").insert({
    project_id: projectId,
    activity_type: activityType,
    description,
    metadata,
    created_by: createdBy ?? null,
  });
}

function isLaborItem(item: { product_name: string }): boolean {
  const name = (item.product_name ?? "").toLowerCase();
  return (
    name.includes("install") ||
    name.includes("spreading") ||
    name.includes("labor") ||
    name.includes("service") ||
    name.includes("grading") ||
    name.includes("compaction") ||
    name.includes("removal") ||
    name.includes("cleanup") ||
    name.includes("maintenance")
  );
}

function detectServiceType(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("driveway")) return "driveways";
  if (lower.includes("landscap")) return "landscaping";
  if (lower.includes("mason") || lower.includes("patio") || lower.includes("walkway") || lower.includes("stoop")) return "masonry";
  if (lower.includes("maint") || lower.includes("cleanup")) return "property-maintenance";
  return "other";
}

/**
 * Create a project from an accepted quote (deposit paid).
 */
export async function createProjectFromQuote(quote: {
  id: string;
  quote_number: string;
  public_token: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string | null;
  title: string;
  description: string | null;
  line_items: any[];
  total_cents: number;
  deposit_paid_cents: number;
  estimated_timeline: string | null;
  accepted_at: string | null;
  customer_signature_url: string | null;
  converted_order_id: string | null;
}, createdBy?: string): Promise<any> {
  const supabase = getSupabaseAdminClient() as any;

  // Check if project already exists for this quote
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("quote_id", quote.id)
    .maybeSingle();
  if (existing) return existing;

  const projectNumber = await generateProjectNumber();
  const serviceType = detectServiceType(`${quote.title} ${quote.description ?? ""}`);

  const documents: any[] = [
    {
      type: "quote",
      name: `Quote ${quote.quote_number}`,
      url: `/quote/${quote.public_token}`,
      date: new Date().toISOString(),
    },
  ];
  if (quote.customer_signature_url) {
    documents.push({
      type: "signature",
      name: "Customer Signature",
      url: quote.customer_signature_url,
      date: quote.accepted_at ?? new Date().toISOString(),
    });
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      project_number: projectNumber,
      title: quote.title,
      description: quote.description,
      status: "scheduled",
      project_type: "service",
      service_type: serviceType,
      customer_id: quote.customer_id,
      customer_name: quote.customer_name,
      customer_phone: quote.customer_phone,
      customer_email: quote.customer_email,
      address: quote.customer_address,
      quote_id: quote.id,
      order_id: quote.converted_order_id,
      quote_total_cents: quote.total_cents,
      deposit_cents: quote.deposit_paid_cents,
      paid_cents: quote.deposit_paid_cents,
      balance_due_cents: quote.total_cents - quote.deposit_paid_cents,
      documents,
      priority: "normal",
      created_by: createdBy ?? null,
    })
    .select("id, project_number")
    .single();

  if (error) {
    console.error("Project creation failed:", error);
    return null;
  }

  await logProjectActivity(
    project.id,
    "created",
    `Project created from ${quote.quote_number}`,
    { quote_id: quote.id, deposit_cents: quote.deposit_paid_cents },
    createdBy,
  );

  return project;
}

/**
 * Create a project from a POS order that contains labor/service items.
 * Returns null if no labor items detected.
 */
export async function createProjectFromPOSOrder(order: {
  id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  delivery_address: string | null;
  delivery_method: string;
  grand_total_cents: number;
}, createdBy?: string): Promise<any> {
  const supabase = getSupabaseAdminClient() as any;

  const { data: items } = await supabase
    .from("order_items")
    .select("product_name, quantity, unit, unit_price_cents, line_subtotal_cents")
    .eq("order_id", order.id);

  const orderItems: any[] = items ?? [];
  const hasLabor = orderItems.some(isLaborItem);
  if (!hasLabor) return null;

  // Check if project already exists
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("order_id", order.id)
    .maybeSingle();
  if (existing) return existing;

  const projectNumber = await generateProjectNumber();
  const laborItems = orderItems.filter(isLaborItem);
  const title = laborItems[0]?.product_name ?? "Service Order";

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      project_number: projectNumber,
      title,
      status: "scheduled",
      project_type: "install",
      service_type: detectServiceType(title),
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_email: order.customer_email,
      address: order.delivery_address,
      order_id: order.id,
      quote_total_cents: order.grand_total_cents,
      deposit_cents: order.grand_total_cents,
      paid_cents: order.grand_total_cents,
      balance_due_cents: 0,
      priority: "normal",
      created_by: createdBy ?? null,
    })
    .select("id, project_number")
    .single();

  if (error) {
    console.error("POS project creation failed:", error);
    return null;
  }

  await logProjectActivity(
    project.id,
    "created",
    `Project created from POS order #${order.id.slice(0, 8)}`,
    { order_id: order.id },
    createdBy,
  );

  return project;
}

export { logProjectActivity, isLaborItem };
