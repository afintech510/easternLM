import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms";

/**
 * POST /api/apply/credit-account
 * Public endpoint — contractor submits credit account application.
 * Creates a service lead + notifies the office.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const {
    company_name, contact_name, phone, email, address, city, state, zip,
    tax_exempt, tax_exempt_certificate, license_number, years_in_business,
    estimated_monthly_spend, materials_of_interest, reference_name,
    reference_phone, notes,
  } = body;

  if (!company_name || !contact_name || !phone) {
    return NextResponse.json({ error: "Company name, contact name, and phone required" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient() as any;

  // Check if customer already exists by phone
  const normalizedPhone = phone.replace(/\D/g, "");
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  // Create or update customer
  let customerId = existingCustomer?.id;
  if (!customerId) {
    const { data: newCust } = await supabase
      .from("customers")
      .insert({
        first_name: contact_name.split(" ")[0] || contact_name,
        last_name: contact_name.split(" ").slice(1).join(" ") || null,
        company_name,
        phone: normalizedPhone,
        email: email || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        tags: ["contractor"],
      })
      .select("id")
      .single();
    customerId = newCust?.id;
  }

  // Create service lead for the credit account application
  const fullAddress = [address, city, state, zip].filter(Boolean).join(", ");
  const description = [
    `Credit account application: ${company_name}`,
    `Contact: ${contact_name} — ${phone}${email ? ` / ${email}` : ""}`,
    years_in_business ? `Years in business: ${years_in_business}` : null,
    license_number ? `License: ${license_number}` : null,
    estimated_monthly_spend ? `Est. monthly spend: ${estimated_monthly_spend}` : null,
    materials_of_interest ? `Materials: ${materials_of_interest}` : null,
    tax_exempt ? `Tax exempt — cert: ${tax_exempt_certificate || "pending"}` : null,
    reference_name ? `Reference: ${reference_name}${reference_phone ? ` (${reference_phone})` : ""}` : null,
    notes ? `Notes: ${notes}` : null,
  ].filter(Boolean).join("\n");

  await supabase.from("service_leads").insert({
    name: `${contact_name} — ${company_name}`,
    phone: normalizedPhone,
    email: email || null,
    address: fullAddress || null,
    service_type: "credit_account",
    description,
    status: "new",
    source: "web",
    source_detail: "Credit account application form",
    customer_id: customerId || null,
  });

  // Notify office via SMS
  await sendSms(
    "+16318746244",
    `New credit account application!\n${company_name}\n${contact_name} — ${phone}\nEst. spend: ${estimated_monthly_spend || "not specified"}\n\nReview in admin: /admin/leads`
  ).catch(() => {});

  // Send confirmation email if provided
  if (email) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: `Eastern LM <${process.env.RESEND_FROM_EMAIL ?? "orders@easternlm.com"}>`,
        to: email,
        subject: "Credit Account Application Received — Eastern LM",
        html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
          <h2 style="color:#1a3a5c;">Application Received</h2>
          <p>Hi ${contact_name},</p>
          <p>Thank you for applying for a contractor charge account with Eastern Landscape & Mason Supply.</p>
          <p>We'll review your application and contact you within 1-2 business days to finalize your account setup.</p>
          <p><strong>Account Details:</strong></p>
          <ul>
            <li>Company: ${company_name}</li>
            <li>Terms: Net 30 (standard)</li>
            ${tax_exempt ? `<li>Tax Exempt: Yes (cert: ${tax_exempt_certificate || "pending"})</li>` : ""}
          </ul>
          <p>Questions? Call us at <a href="tel:6318746244">(631) 874-6244</a></p>
          <p style="color:#888;font-size:12px;margin-top:20px;">Eastern Landscape & Mason Supply<br/>110 Frowein Road, Center Moriches, NY 11934</p>
        </div>`,
      });
    } catch {}
  }

  return NextResponse.json({ ok: true });
}
