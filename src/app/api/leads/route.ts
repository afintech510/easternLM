import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const SERVICE_TYPES = [
  "gravel-driveway-new",
  "gravel-driveway-resurface",
  "paver-driveway",
  "driveway-edging",
  "asphalt-prep",
  "landscaping-design",
  "landscaping-grading-drainage",
  "landscaping-sod-lawn",
  "landscaping-retaining-wall",
  "landscaping-garden-beds",
  "masonry-patio",
  "masonry-walkway",
  "masonry-retaining-wall",
  "masonry-fireplace",
  "masonry-veneer-steps",
  "property-maintenance",
  "other",
];

const TIMELINES = [
  "asap",
  "within-2-weeks",
  "within-a-month",
  "just-planning",
];

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").replace(/\D/g, "");
  const email = String(body.email || "").trim().toLowerCase() || null;
  const address = String(body.address || "").trim() || null;
  const town = String(body.town || "").trim() || null;
  const zip = String(body.zip || "").trim() || null;
  const serviceType = String(body.serviceType || "");
  const description = String(body.description || "").trim() || null;
  const timeline = String(body.timeline || "").trim() || null;
  const referralSource = String(body.referralSource || "").trim() || null;
  const photoUrls = Array.isArray(body.photoUrls) ? body.photoUrls.filter((u): u is string => typeof u === "string") : [];

  // Validate
  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (phone.length !== 10) {
    return NextResponse.json({ error: "Phone must be 10 digits" }, { status: 400 });
  }
  if (!SERVICE_TYPES.includes(serviceType)) {
    return NextResponse.json({ error: "Invalid service type" }, { status: 400 });
  }
  if (timeline && !TIMELINES.includes(timeline)) {
    return NextResponse.json({ error: "Invalid timeline" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  // Auto-link to existing customer by phone
  let customerId: string | null = null;
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id, total_orders, total_spent_cents")
    .eq("phone", phone)
    .maybeSingle();

  if (existingCustomer) {
    customerId = existingCustomer.id;
  }

  // Insert lead
  const { data: lead, error } = await supabase
    .from("service_leads")
    .insert({
      customer_id: customerId,
      name,
      phone,
      email,
      address,
      town,
      zip,
      service_type: serviceType,
      description,
      timeline,
      referral_source: referralSource,
      photo_urls: photoUrls,
      metadata: existingCustomer
        ? { existingCustomer: true, totalOrders: existingCustomer.total_orders, totalSpentCents: existingCustomer.total_spent_cents }
        : {},
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
  }

  // Send notification email (non-blocking)
  sendLeadNotification({
    name,
    phone,
    town: town || "(not provided)",
    serviceType,
    timeline: timeline || "(not specified)",
    description: description || "(none)",
    existingCustomer: existingCustomer
      ? { totalOrders: existingCustomer.total_orders, totalSpentCents: existingCustomer.total_spent_cents }
      : null,
  }).catch(() => {});

  return NextResponse.json({ id: lead.id, linkedCustomer: !!customerId });
}

const SERVICE_LABELS: Record<string, string> = {
  "gravel-driveway-new": "Gravel Driveway — New Installation",
  "gravel-driveway-resurface": "Gravel Driveway — Resurfacing",
  "paver-driveway": "Paver Driveway Installation",
  "driveway-edging": "Driveway Edging",
  "asphalt-prep": "Asphalt Prep / Grading",
  "landscaping-design": "Landscaping — Design & Installation",
  "landscaping-grading-drainage": "Landscaping — Grading & Drainage",
  "landscaping-sod-lawn": "Landscaping — Sod / Lawn Installation",
  "landscaping-retaining-wall": "Landscaping — Retaining Wall",
  "landscaping-garden-beds": "Landscaping — Garden Beds",
  "masonry-patio": "Masonry — Patio",
  "masonry-walkway": "Masonry — Walkway",
  "masonry-retaining-wall": "Masonry — Retaining Wall",
  "masonry-fireplace": "Masonry — Fireplace / Outdoor Kitchen",
  "masonry-veneer-steps": "Masonry — Stone Veneer / Steps",
  "property-maintenance": "Property Maintenance",
  "other": "Other",
};

async function sendLeadNotification(data: {
  name: string;
  phone: string;
  town: string;
  serviceType: string;
  timeline: string;
  description: string;
  existingCustomer: { totalOrders: number; totalSpentCents: number } | null;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) return;

  const serviceLabel = SERVICE_LABELS[data.serviceType] || data.serviceType;
  const phoneFormatted = `(${data.phone.slice(0, 3)}) ${data.phone.slice(3, 6)}-${data.phone.slice(6)}`;

  let customerNote = "";
  if (data.existingCustomer) {
    const spent = (data.existingCustomer.totalSpentCents / 100).toFixed(2);
    customerNote = `
    <tr><td colspan="2" style="padding:12px 16px;background:#f0fdf4;border-radius:8px;">
      <strong style="color:#16a34a;">RETURNING CUSTOMER</strong><br/>
      ${data.existingCustomer.totalOrders} previous orders, $${spent} lifetime spend
    </td></tr>`;
  }

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:500px;">
      <h2 style="color:#1e3a5f;margin:0 0 16px;">New ${serviceLabel} Lead</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 16px;color:#666;">Name</td><td style="padding:8px 16px;font-weight:600;">${escapeHtml(data.name)}</td></tr>
        <tr><td style="padding:8px 16px;color:#666;">Phone</td><td style="padding:8px 16px;font-weight:600;"><a href="tel:+1${data.phone}">${phoneFormatted}</a></td></tr>
        <tr><td style="padding:8px 16px;color:#666;">Town</td><td style="padding:8px 16px;">${escapeHtml(data.town)}</td></tr>
        <tr><td style="padding:8px 16px;color:#666;">Service</td><td style="padding:8px 16px;">${serviceLabel}</td></tr>
        <tr><td style="padding:8px 16px;color:#666;">Timeline</td><td style="padding:8px 16px;">${escapeHtml(data.timeline)}</td></tr>
        <tr><td style="padding:8px 16px;color:#666;">Description</td><td style="padding:8px 16px;">${escapeHtml(data.description)}</td></tr>
        ${customerNote}
      </table>
    </div>
  `;

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: fromEmail,
    to: "sales@easternlm.com",
    subject: `New ${serviceLabel} Lead — ${data.name} in ${data.town}`,
    html,
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
