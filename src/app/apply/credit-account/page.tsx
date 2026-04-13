"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { CheckCircle, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

export default function CreditAccountApplicationPage() {
  return stripePromise ? (
    <Elements stripe={stripePromise}>
      <CreditAccountForm />
    </Elements>
  ) : (
    <CreditAccountForm />
  );
}

function CreditAccountForm() {
  const stripe = useStripe?.() ?? null;
  const elements = useElements?.() ?? null;
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [cardComplete, setCardComplete] = useState(false);
  const [skipCard, setSkipCard] = useState(false);

  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "NY",
    zip: "",
    tax_exempt: false,
    tax_exempt_certificate: "",
    license_number: "",
    years_in_business: "",
    estimated_monthly_spend: "",
    materials_of_interest: "",
    reference_name: "",
    reference_phone: "",
    notes: "",
  });

  function update(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_name || !form.contact_name || !form.phone) {
      setError("Company name, contact name, and phone are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      let stripeCustomerId: string | null = null;

      // If card provided, create SetupIntent and confirm
      if (!skipCard && stripe && elements && cardComplete) {
        const cardElement = elements.getElement(CardElement);
        if (cardElement) {
          // Create SetupIntent
          const siRes = await fetch("/api/apply/credit-account/setup-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              company_name: form.company_name,
              contact_name: form.contact_name,
              phone: form.phone,
              email: form.email,
            }),
          });
          const siData = await siRes.json();
          if (!siRes.ok) throw new Error(siData.error || "Failed to create card setup");

          // Confirm the SetupIntent with the card
          const { error: stripeError } = await stripe.confirmCardSetup(siData.clientSecret, {
            payment_method: {
              card: cardElement,
              billing_details: {
                name: form.company_name,
                email: form.email || undefined,
                phone: form.phone || undefined,
              },
            },
          });
          if (stripeError) throw new Error(stripeError.message);
          stripeCustomerId = siData.customerId;
        }
      }

      // Submit application
      const res = await fetch("/api/apply/credit-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, stripe_customer_id: stripeCustomerId }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const d = await res.json();
        setError(d.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <CheckCircle className="size-16 text-green-500" />
        <h1 className="text-2xl font-bold text-primary">Application Received!</h1>
        <p className="text-muted-foreground max-w-md">
          Thank you, {form.contact_name}. We&apos;ll review your application and contact you
          within 1-2 business days to set up your charge account.
        </p>
        <p className="text-sm text-muted-foreground">
          Questions? Call <a href="tel:6318746244" className="text-accent underline">(631) 874-6244</a>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="text-center mb-8">
        <Image src="/logo-elm-blue.webp" alt="Eastern LM" width={180} height={50} className="mx-auto mb-4" />
        <h1 className="[font-family:var(--font-display)] text-3xl text-primary">Contractor Credit Account</h1>
        <p className="text-muted-foreground mt-2">
          Apply for a charge account — no upfront payment on materials, flexible Net 30 terms.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Info */}
        <fieldset className="space-y-4 rounded-xl border p-5">
          <legend className="text-sm font-semibold px-2">Business Information</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium">Company Name *</label>
              <Input value={form.company_name} onChange={(e) => update("company_name", e.target.value)} placeholder="Your Company Name" required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Contact Name *</label>
              <Input value={form.contact_name} onChange={(e) => update("contact_name", e.target.value)} placeholder="John Smith" required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Phone *</label>
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(631) 555-1234" type="tel" required />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium">Email</label>
              <Input value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="name@yourcompany.com" type="email" />
            </div>
          </div>
        </fieldset>

        {/* Address */}
        <fieldset className="space-y-4 rounded-xl border p-5">
          <legend className="text-sm font-semibold px-2">Business Address</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium">Street Address</label>
              <Input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="123 Main Street" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">City</label>
              <Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Center Moriches" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">State</label>
                <Input value={form.state} onChange={(e) => update("state", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">ZIP</label>
                <Input value={form.zip} onChange={(e) => update("zip", e.target.value)} placeholder="11934" />
              </div>
            </div>
          </div>
        </fieldset>

        {/* Business Details */}
        <fieldset className="space-y-4 rounded-xl border p-5">
          <legend className="text-sm font-semibold px-2">Business Details</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Contractor License #</label>
              <Input value={form.license_number} onChange={(e) => update("license_number", e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Years in Business</label>
              <Input value={form.years_in_business} onChange={(e) => update("years_in_business", e.target.value)} placeholder="e.g. 5" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Estimated Monthly Spend</label>
              <select value={form.estimated_monthly_spend} onChange={(e) => update("estimated_monthly_spend", e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm bg-background">
                <option value="">Select range</option>
                <option value="under-1000">Under $1,000</option>
                <option value="1000-5000">$1,000 - $5,000</option>
                <option value="5000-10000">$5,000 - $10,000</option>
                <option value="10000-25000">$10,000 - $25,000</option>
                <option value="over-25000">Over $25,000</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Primary Materials</label>
              <Input value={form.materials_of_interest} onChange={(e) => update("materials_of_interest", e.target.value)} placeholder="Mulch, gravel, stone..." />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.tax_exempt} onChange={(e) => update("tax_exempt", e.target.checked)} className="rounded" />
            Tax exempt
          </label>
          {form.tax_exempt && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Tax Exempt Certificate #</label>
              <Input value={form.tax_exempt_certificate} onChange={(e) => update("tax_exempt_certificate", e.target.value)} placeholder="Certificate number" />
            </div>
          )}
        </fieldset>

        {/* Reference */}
        <fieldset className="space-y-4 rounded-xl border p-5">
          <legend className="text-sm font-semibold px-2">Trade Reference (optional)</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Reference Name</label>
              <Input value={form.reference_name} onChange={(e) => update("reference_name", e.target.value)} placeholder="Supplier or business reference" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Reference Phone</label>
              <Input value={form.reference_phone} onChange={(e) => update("reference_phone", e.target.value)} placeholder="(631) 555-0000" type="tel" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Additional Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Anything else we should know about your business or account needs..."
              className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
            />
          </div>
        </fieldset>

        {/* Card on File */}
        <fieldset className="space-y-4 rounded-xl border p-5">
          <legend className="text-sm font-semibold px-2 flex items-center gap-1.5">
            <CreditCard className="size-4" /> Card on File
          </legend>
          <p className="text-xs text-muted-foreground">
            Add a credit card for convenient statement payments. Your card will not be charged now — it&apos;s securely stored for future billing.
          </p>
          {!skipCard ? (
            <>
              <div className="rounded-lg border bg-background p-3">
                <CardElement
                  options={{
                    style: {
                      base: { fontSize: "16px", color: "#1a3a5c", "::placeholder": { color: "#9ca3af" } },
                      invalid: { color: "#ef4444" },
                    },
                  }}
                  onChange={(e) => setCardComplete(e.complete)}
                />
              </div>
              <button type="button" onClick={() => setSkipCard(true)} className="text-xs text-muted-foreground underline">
                Skip — I&apos;ll add a card later
              </button>
            </>
          ) : (
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">No card added — you can add one later.</p>
              <button type="button" onClick={() => setSkipCard(false)} className="text-xs text-accent underline">Add card</button>
            </div>
          )}
        </fieldset>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" disabled={submitting} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 text-base">
          {submitting ? <><Loader2 className="mr-2 size-4 animate-spin" /> Submitting...</> : "Submit Application"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          By submitting, you agree to our payment terms. Credit accounts are subject to approval.
          <br />Eastern Landscape &amp; Mason Supply — (631) 874-6244
        </p>
      </form>
    </div>
  );
}
