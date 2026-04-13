import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? process.env.PROD_STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-02-24.acacia" as Stripe.LatestApiVersion,
});

/**
 * POST /api/apply/credit-account/setup-intent
 * Creates a Stripe Customer + SetupIntent for saving a card on file.
 */
export async function POST(request: Request) {
  const { company_name, contact_name, phone, email } = await request.json();

  if (!company_name || !contact_name) {
    return NextResponse.json({ error: "Company name and contact name required" }, { status: 400 });
  }

  // Create Stripe customer
  const customer = await stripe.customers.create({
    name: company_name,
    email: email || undefined,
    phone: phone || undefined,
    metadata: {
      contact_name,
      source: "credit_account_application",
    },
  });

  // Create SetupIntent to save card without charging
  const setupIntent = await stripe.setupIntents.create({
    customer: customer.id,
    payment_method_types: ["card"],
    metadata: {
      company_name,
      contact_name,
      source: "credit_account_application",
    },
  });

  return NextResponse.json({
    clientSecret: setupIntent.client_secret,
    customerId: customer.id,
  });
}
