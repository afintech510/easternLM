import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type CheckoutSuccessPageProps = {
  searchParams: Promise<{
    session_id?: string;
  }>;
};

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const query = await searchParams;
  const sessionId = query.session_id;
  let order:
    | {
        id: string;
        status: string;
        customer_name: string;
        delivery_method: string;
        grand_total_cents: number;
      }
    | null = null;

  if (sessionId) {
    const supabaseAdmin = getSupabaseAdminClient();
    const result = await supabaseAdmin
      .from("orders")
      .select("id, status, customer_name, delivery_method, grand_total_cents")
      .eq("stripe_checkout_session_id", sessionId)
      .maybeSingle();

    if (!result.error && result.data) {
      order = result.data;
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Order Received</p>
      <h1 className="[font-family:var(--font-display)] text-5xl text-primary">Thank You</h1>
      <p className="text-sm text-muted-foreground">
        Payment was submitted successfully. Order confirmation and scheduling details will be emailed shortly.
      </p>
      {order ? (
        <div className="rounded-2xl border bg-card p-5 text-left">
          <p className="text-sm">
            Order ID: <span className="font-semibold">{order.id}</span>
          </p>
          <p className="text-sm">
            Customer: <span className="font-semibold">{order.customer_name}</span>
          </p>
          <p className="text-sm">
            Delivery Method: <span className="font-semibold">{order.delivery_method}</span>
          </p>
          <p className="text-sm">
            Status: <span className="font-semibold">{order.status}</span>
          </p>
          <p className="text-sm">
            Total: <span className="font-semibold">{formatUsd(order.grand_total_cents)}</span>
          </p>
        </div>
      ) : null}
      <div className="flex justify-center gap-2">
        <Button asChild>
          <Link href="/shop">Continue Shopping</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back Home</Link>
        </Button>
      </div>
    </div>
  );
}
