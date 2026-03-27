import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function escapeCsv(val: unknown): string {
  if (val == null) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { orderIds } = body;

  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    return NextResponse.json({ error: "orderIds required" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orders, error } = await (supabase as any)
    .from("orders")
    .select(
      "id, created_at, status, source, customer_name, customer_phone, customer_email, grand_total_cents, materials_subtotal_cents, delivery_total_cents, tax_cents, cc_surcharge_cents, delivery_method, delivery_address, delivery_date, delivery_time_window, payment_method, order_items(product_name, quantity, unit, unit_price_cents, line_subtotal_cents)",
    )
    .in("id", orderIds)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const headers = [
    "Order ID",
    "Date",
    "Status",
    "Source",
    "Customer Name",
    "Phone",
    "Email",
    "Items",
    "Delivery Method",
    "Delivery Address",
    "Delivery Date",
    "Time Window",
    "Materials ($)",
    "Delivery Fee ($)",
    "Tax ($)",
    "CC Fee ($)",
    "Total ($)",
    "Payment Method",
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (orders || []).map((o: any) => {
    const items = (o.order_items || [])
      .filter((i: { product_name: string }) => !i.product_name?.startsWith("Delivery Load") && !i.product_name?.startsWith("Sales Tax") && !i.product_name?.startsWith("Credit Card"))
      .map((i: { quantity: number; product_name: string }) => `${i.quantity} ${i.product_name}`)
      .join("; ");

    return [
      o.id.slice(0, 8),
      new Date(o.created_at).toLocaleString("en-US"),
      o.status,
      o.source || "web",
      o.customer_name || "",
      o.customer_phone || "",
      o.customer_email || "",
      items,
      o.delivery_method || "pickup",
      o.delivery_address || "",
      o.delivery_date || "",
      o.delivery_time_window || "",
      ((o.materials_subtotal_cents || 0) / 100).toFixed(2),
      ((o.delivery_total_cents || 0) / 100).toFixed(2),
      ((o.tax_cents || 0) / 100).toFixed(2),
      ((o.cc_surcharge_cents || 0) / 100).toFixed(2),
      ((o.grand_total_cents || 0) / 100).toFixed(2),
      o.payment_method || "",
    ].map(escapeCsv);
  });

  const csv = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="orders-export-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
