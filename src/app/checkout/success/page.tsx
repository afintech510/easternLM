import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { CheckCircle2, MapPin, Phone, Truck } from "lucide-react";
import { CartClearer } from "@/components/checkout/cart-clearer";

type CheckoutSuccessPageProps = {
  searchParams: Promise<{
    session_id?: string;
    orderId?: string;
    cod?: string;
  }>;
};

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

type OrderItem = {
  product_name: string;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  line_subtotal_cents: number;
  delivery_type: string | null;
};

export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const query = await searchParams;
  const sessionId = query.session_id;
  const orderIdParam = query.orderId;
  const isCod = query.cod === "1";
  let order: {
    id: string;
    status: string;
    payment_method: string | null;
    customer_name: string;
    customer_email: string | null;
    customer_phone: string | null;
    delivery_method: string;
    delivery_address: string | null;
    materials_subtotal_cents: number;
    delivery_total_cents: number;
    tax_cents: number;
    cc_surcharge_cents: number;
    grand_total_cents: number;
    total_loads: number;
    metadata: Record<string, unknown> | null;
  } | null = null;
  let items: OrderItem[] = [];

  const supabaseAdmin = getSupabaseAdminClient();
  const selectCols = "id, status, payment_method, customer_name, customer_email, customer_phone, delivery_method, delivery_address, materials_subtotal_cents, delivery_total_cents, tax_cents, cc_surcharge_cents, grand_total_cents, total_loads, metadata";

  if (orderIdParam) {
    // COD flow — look up by direct order ID
    const result = await (supabaseAdmin as any)
      .from("orders")
      .select(selectCols)
      .eq("id", orderIdParam)
      .maybeSingle();
    if (!result.error && result.data) order = result.data;
  } else if (sessionId) {
    // Card flow — look up by Stripe session/PI ID
    const result = await (supabaseAdmin as any)
      .from("orders")
      .select(selectCols)
      .eq("stripe_checkout_session_id", sessionId)
      .maybeSingle();
    if (!result.error && result.data) order = result.data;
  }

  if (order) {
    const itemsResult = await supabaseAdmin
      .from("order_items")
      .select("product_name, quantity, unit, unit_price_cents, line_subtotal_cents, delivery_type")
      .eq("order_id", order.id)
      .order("created_at");

    if (!itemsResult.error && itemsResult.data) {
      items = itemsResult.data.filter((i) => !i.product_name.startsWith("Delivery Load"));
    }
  }

  const codDiscountCents = Number((order?.metadata as any)?.codDiscountCents) || 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-16">
      <CartClearer />
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="size-8 text-green-600" />
        </div>
        <h1 className="[font-family:var(--font-display)] text-4xl text-primary">Order Confirmed</h1>
        <p className="text-muted-foreground">
          {isCod || order?.payment_method === "cod"
            ? "Your order is confirmed. Payment will be collected on delivery."
            : "Payment received. We'll email confirmation and delivery details shortly."}
        </p>
      </div>

      {order ? (
        <div className="space-y-4">
          {/* Order details card */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <p className="text-xs text-muted-foreground">Order ID</p>
                <p className="font-mono text-sm font-medium">{order.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                order.payment_method === "cod"
                  ? "bg-amber-100 text-amber-700"
                  : order.status === "paid"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-700"
              }`}>
                {order.payment_method === "cod" ? "COD — Due on Delivery" : order.status === "paid" ? "Paid" : order.status}
              </span>
            </div>

            {/* Customer info */}
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="font-medium">{order.customer_name}</p>
              </div>
              {order.customer_phone && (
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{order.customer_phone}</p>
                </div>
              )}
            </div>

            {/* Delivery info */}
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm">
              {order.delivery_method === "delivery" ? (
                <>
                  <Truck className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">Delivery</p>
                    {order.delivery_address && (
                      <p className="text-xs text-muted-foreground">{order.delivery_address}</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">Pickup at Yard</p>
                    <p className="text-xs text-muted-foreground">110 Frowein Road, Center Moriches, NY 11934</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h2 className="text-sm font-semibold">Items Ordered</h2>
              <div className="divide-y">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} {item.unit} &times; {formatUsd(item.unit_price_cents)}
                      </p>
                    </div>
                    <span className="font-semibold">{formatUsd(item.line_subtotal_cents)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1.5 border-t pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Materials</span>
                  <span>{formatUsd(order.materials_subtotal_cents)}</span>
                </div>
                {order.delivery_total_cents > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Delivery ({order.total_loads} load{order.total_loads > 1 ? "s" : ""})
                    </span>
                    <span>{formatUsd(order.delivery_total_cents)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax (8.75%)</span>
                  <span>{formatUsd(order.tax_cents)}</span>
                </div>
                {order.cc_surcharge_cents > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CC processing fee (3.5%)</span>
                    <span>{formatUsd(order.cc_surcharge_cents)}</span>
                  </div>
                )}
                {order.payment_method === "cod" && codDiscountCents > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">COD discount (3%)</span>
                    <span className="text-green-600">-{formatUsd(codDiscountCents)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 text-lg font-bold text-primary">
                  <span>{order.payment_method === "cod" ? "Due on Delivery" : "Total"}</span>
                  <span>{formatUsd(order.grand_total_cents)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Next steps */}
          <div className="rounded-xl border border-accent/20 bg-accent/5 p-5 space-y-2">
            <h2 className="text-sm font-semibold">What Happens Next</h2>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>1. You&apos;ll receive an email confirmation shortly</li>
              <li>2. Our team will schedule your {order.delivery_method === "delivery" ? "delivery" : "pickup"}</li>
              <li>3. We&apos;ll text you when your order is on the way</li>
              {order.payment_method === "cod" && (
                <li>4. <strong>Have {formatUsd(order.grand_total_cents)} in cash or check ready for the driver</strong></li>
              )}
            </ul>
            <p className="pt-1 text-sm">
              Questions? Call us: <a href="tel:+16318746244" className="font-semibold text-primary hover:underline">(631) 874-6244</a>
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-5 text-center">
          <p className="text-muted-foreground">Order details are being processed. Check your email for confirmation.</p>
        </div>
      )}

      <div className="flex justify-center gap-3 pt-2">
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
