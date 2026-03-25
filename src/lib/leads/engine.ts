import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, ensureCustomerForOrder } from "@/lib/customers/lifecycle";
import { sendSms } from "@/lib/sms";

/**
 * Generate lead number: LEAD-YYYY-NNNN
 */
async function generateLeadNumber(): Promise<string> {
  const supabase = getSupabaseAdminClient() as any;
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("service_leads")
    .select("id", { count: "exact", head: true })
    .gte("created_at", `${year}-01-01T00:00:00Z`);
  const seq = ((count ?? 0) + 1).toString().padStart(4, "0");
  return `LEAD-${year}-${seq}`;
}

/**
 * Create a service lead from any source.
 */
export async function createServiceLead(input: {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  town?: string;
  zip?: string;
  service_type: string;
  description?: string;
  timeline?: string;
  source: string;
  source_detail?: string;
  priority?: string;
  property_type?: string;
  estimated_value_cents?: number;
  photo_urls?: string[];
  created_by?: string;
}): Promise<any> {
  const supabase = getSupabaseAdminClient() as any;

  // Auto-link to customer
  const phone = normalizePhone(input.phone);
  let customerId: string | null = null;
  if (phone) {
    const { data } = await supabase.from("customers").select("id").eq("phone", phone).maybeSingle();
    if (data) {
      customerId = data.id;
    } else {
      // Create customer
      const cid = await ensureCustomerForOrder({
        customer_name: input.name,
        customer_phone: input.phone,
        customer_email: input.email ?? null,
        delivery_address: input.address ?? null,
      });
      customerId = cid;
    }
  }

  const leadNumber = await generateLeadNumber();

  const { data: lead, error } = await supabase
    .from("service_leads")
    .insert({
      lead_number: leadNumber,
      customer_id: customerId,
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      address: input.address ?? null,
      town: input.town ?? null,
      zip: input.zip ?? null,
      service_type: input.service_type,
      description: input.description ?? null,
      timeline: input.timeline ?? null,
      source: input.source,
      source_detail: input.source_detail ?? null,
      priority: input.priority ?? "normal",
      property_type: input.property_type ?? null,
      estimated_value_cents: input.estimated_value_cents ?? null,
      photo_urls: input.photo_urls ?? [],
      status: "new",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  // Log creation
  await logLeadActivity(lead.id, "created", `Lead created from ${input.source}`, {}, input.created_by);

  // Auto-assign
  await autoAssignLead(lead);

  return lead;
}

/**
 * Auto-assign lead to sales team + matching contractors.
 */
export async function autoAssignLead(lead: any): Promise<void> {
  const supabase = getSupabaseAdminClient() as any;

  // Get active sales staff (admin + staff roles)
  const { data: staff } = await supabase
    .from("accounts")
    .select("id, full_name")
    .in("role", ["admin", "staff"])
    .eq("is_active", true);

  const staffIds = (staff ?? []).map((s: any) => s.id);

  // Find matching contractors
  const { data: contractors } = await supabase
    .from("contractors")
    .select("*")
    .contains("service_types", [lead.service_type])
    .eq("is_active", true)
    .order("current_active_leads", { ascending: true })
    .limit(2);

  const contractorIds = (contractors ?? []).map((c: any) => c.id);

  // Update lead
  await supabase.from("service_leads").update({
    assigned_to: staffIds.length > 0 ? staffIds[0] : null, // Primary assignee
    assigned_contractors: contractorIds,
    assigned_at: new Date().toISOString(),
    status: staffIds.length > 0 || contractorIds.length > 0 ? "assigned" : "new",
  }).eq("id", lead.id);

  // Increment contractor active leads
  for (const c of contractors ?? []) {
    await supabase.from("contractors").update({
      current_active_leads: (c.current_active_leads ?? 0) + 1,
      total_leads_assigned: (c.total_leads_assigned ?? 0) + 1,
    }).eq("id", c.id);
  }

  // Notify contractors via SMS
  for (const c of contractors ?? []) {
    if (c.sms_notifications && c.phone) {
      await sendLeadNotificationSms(c.phone, lead, c.name);
    }
  }

  // Notify sales team
  for (const s of staff ?? []) {
    // Staff notifications go through the admin badges system (real-time)
    // Could also add SMS notifications here if configured
  }

  await logLeadActivity(lead.id, "assigned",
    `Assigned to ${(staff ?? []).map((s: any) => s.full_name).join(", ")}${contractorIds.length > 0 ? ` + ${contractorIds.length} contractor(s)` : ""}`,
  );
}

/**
 * Send SMS notification to contractor about new lead.
 */
async function sendLeadNotificationSms(phone: string, lead: any, contractorName: string): Promise<void> {
  const body = `Eastern LM — New lead assigned to you:\n${lead.service_type}: ${(lead.description ?? "").slice(0, 80)}\nCustomer: ${lead.name} — ${lead.town ?? ""}\nTimeline: ${lead.timeline ?? "Flexible"}\nCall customer: ${lead.phone}\nQuestions? Call us: (631) 874-6244`;
  await sendSms(phone, body).catch(() => {});
}

/**
 * Log activity on a lead.
 */
export async function logLeadActivity(
  leadId: string,
  activityType: string,
  description: string,
  metadata: Record<string, any> = {},
  createdBy?: string,
): Promise<void> {
  const supabase = getSupabaseAdminClient() as any;
  await supabase.from("lead_activity").insert({
    lead_id: leadId,
    activity_type: activityType,
    description,
    metadata,
    created_by: createdBy ?? null,
  });
}

/**
 * Update lead status with activity logging.
 */
export async function updateLeadStatus(
  leadId: string,
  newStatus: string,
  metadata: Record<string, any> = {},
  userId?: string,
): Promise<void> {
  const supabase = getSupabaseAdminClient() as any;

  const { data: lead } = await supabase.from("service_leads").select("status").eq("id", leadId).single();
  const oldStatus = lead?.status;

  await supabase.from("service_leads").update({
    status: newStatus,
    updated_at: new Date().toISOString(),
    ...(newStatus === "contacted" ? { last_contacted_at: new Date().toISOString() } : {}),
    ...(newStatus === "lost" ? { lost_reason: metadata.reason ?? null } : {}),
    ...(newStatus === "won" ? { conversion_date: new Date().toISOString() } : {}),
  }).eq("id", leadId);

  await logLeadActivity(leadId, "status_changed",
    `Status changed from ${oldStatus} to ${newStatus}`,
    { old_status: oldStatus, new_status: newStatus, ...metadata },
    userId,
  );
}
