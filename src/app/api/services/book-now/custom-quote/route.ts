import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms";

const customQuoteSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(7),
  address: z.string().optional(),
  projectDescription: z.string().min(10),
  budget: z.string().optional(),
  timeline: z.string().optional(),
});

export async function POST(request: Request) {
  const raw = await request.json();
  const parsed = customQuoteSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid form data", details: parsed.error.issues }, { status: 400 });
  }
  const payload = parsed.data;

  const supabase = getSupabaseAdminClient();

  const { data: lead, error } = await (supabase as any)
    .from("service_leads")
    .insert({
      name: payload.name,
      email: payload.email || null,
      phone: payload.phone,
      address: payload.address || null,
      service_type: "installation",
      description: payload.projectDescription + (payload.budget ? `\n\nBudget: ${payload.budget}` : "") + (payload.timeline ? `\nTimeline: ${payload.timeline}` : ""),
      status: "new",
      source: "web",
      source_detail: "book-now custom project",
      lead_type: "custom_project",
      value_tier: "standard",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to submit: " + error.message }, { status: 500 });
  }

  // Notify admin
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: `Eastern LM Leads <${process.env.RESEND_FROM_EMAIL ?? "orders@easternlm.com"}>`,
      to: ["adam@easternbuilding.supply", "ronnie@easternbuilding.supply"],
      subject: `Custom Project Request: ${payload.name}`,
      html: `<div style="font-family:system-ui,sans-serif;">
        <h2>Custom Project Request</h2>
        <p><strong>Name:</strong> ${payload.name}</p>
        <p><strong>Phone:</strong> ${payload.phone}</p>
        ${payload.email ? `<p><strong>Email:</strong> ${payload.email}</p>` : ""}
        ${payload.address ? `<p><strong>Address:</strong> ${payload.address}</p>` : ""}
        ${payload.budget ? `<p><strong>Budget:</strong> ${payload.budget}</p>` : ""}
        ${payload.timeline ? `<p><strong>Timeline:</strong> ${payload.timeline}</p>` : ""}
        <h3>Project Description</h3>
        <p style="white-space:pre-wrap;">${payload.projectDescription}</p>
        <p><a href="https://easternlm.com/admin/leads">View in Admin</a></p>
      </div>`,
    });
  } catch (err) {
    console.error("[custom-quote] Admin email failed:", err);
  }

  try {
    await sendSms("+16318746244", `Custom project lead: ${payload.name} — ${payload.phone}. ${payload.projectDescription.slice(0, 80)}...`);
  } catch {}

  return NextResponse.json({ ok: true, leadId: lead.id });
}
