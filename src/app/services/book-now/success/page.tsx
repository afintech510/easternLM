import Link from "next/link";
import { CheckCircle2, Clock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type Props = {
  searchParams: Promise<{ orderId?: string }>;
};

function formatUsd(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

export default async function BookNowSuccessPage({ searchParams }: Props) {
  const query = await searchParams;
  const orderId = query.orderId;

  let order: any = null;
  if (orderId) {
    const supabase = getSupabaseAdminClient();
    const { data } = await (supabase as any)
      .from("orders")
      .select("id, customer_name, customer_email, customer_phone, delivery_address, grand_total_cents, delivery_date, metadata")
      .eq("id", orderId)
      .maybeSingle();
    order = data;
  }

  const services = (order?.metadata?.services || []) as Array<{ serviceName: string; packageName: string; quantity: number; lineTotalCents: number }>;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-16">
      <div className="space-y-3 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="size-8 text-green-600" />
        </div>
        <h1 className="[font-family:var(--font-display)] text-4xl text-primary">Booking Received</h1>
        <p className="text-muted-foreground">
          Your card has been <strong>authorized, not charged</strong>. We'll confirm scheduling within 24 hours.
        </p>
      </div>

      {order && (
        <>
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <p className="text-xs text-muted-foreground">Booking ID</p>
                <p className="font-mono text-sm font-medium">{order.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                Auth Hold
              </span>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="font-medium">{order.customer_name}</p>
              </div>
              {order.delivery_address && (
                <div>
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="font-medium">{order.delivery_address}</p>
                </div>
              )}
              {order.delivery_date && (
                <div>
                  <p className="text-xs text-muted-foreground">Preferred Date</p>
                  <p className="font-medium">{order.delivery_date}</p>
                </div>
              )}
            </div>

            {services.length > 0 && (
              <div className="mt-4 border-t pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Services</p>
                <div className="space-y-1">
                  {services.map((s, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{s.serviceName} — {s.packageName}{s.quantity > 1 ? ` × ${s.quantity}` : ""}</span>
                      <span className="font-semibold">{formatUsd(s.lineTotalCents)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-between border-t pt-3 text-lg font-bold text-primary">
              <span>Authorization Total</span>
              <span>{formatUsd(order.grand_total_cents)}</span>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-accent/20 bg-accent/5 p-5">
            <h2 className="font-semibold">What Happens Next</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2"><Clock className="mt-0.5 size-4 shrink-0 text-accent" /> We'll review and call/text within 24 hours to confirm timing</li>
              <li className="flex gap-2"><MessageSquare className="mt-0.5 size-4 shrink-0 text-accent" /> Once confirmed, we capture payment and dispatch the crew</li>
              <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" /> Need to cancel? Call (631) 874-6244 — zero fees if cancelled before capture</li>
            </ul>
          </div>
        </>
      )}

      <div className="flex justify-center gap-3">
        <Button asChild>
          <Link href="/">Back Home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/services/book-now">Book Another Service</Link>
        </Button>
      </div>
    </div>
  );
}
