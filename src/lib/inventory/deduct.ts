import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Deduct inventory for order items when an order is paid.
 * Only deducts for products with track_inventory = true.
 * Logs each adjustment to inventory_adjustments table.
 */
export async function deductInventoryForOrder(orderId: string): Promise<void> {
  const supabase = getSupabaseAdminClient() as any;

  // Get order items with product_id
  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, quantity, product_name")
    .eq("order_id", orderId)
    .not("product_id", "is", null);

  if (!items?.length) return;

  for (const item of items) {
    if (!item.product_id) continue;

    // Check if product tracks inventory
    const { data: product } = await supabase
      .from("products")
      .select("track_inventory, stock_qty, name, low_stock_threshold")
      .eq("id", item.product_id)
      .single();

    if (!product?.track_inventory) continue;

    const currentQty = parseFloat(product.stock_qty) || 0;
    const newQty = currentQty - parseFloat(item.quantity);

    // Update stock
    await supabase
      .from("products")
      .update({ stock_qty: newQty })
      .eq("id", item.product_id);

    // Log adjustment
    await supabase.from("inventory_adjustments").insert({
      product_id: item.product_id,
      adjustment_qty: -parseFloat(item.quantity),
      new_qty: newQty,
      reason: "sold",
      reference_id: orderId,
      notes: `Sold: ${item.quantity} (Order ${orderId.slice(0, 8)})`,
    });

    // Low stock warning (logged for now — could send SMS in future)
    if (newQty <= (parseFloat(product.low_stock_threshold) || 0)) {
      console.warn(`LOW STOCK: ${product.name} = ${newQty}`);
    }
  }
}

/**
 * Reverse inventory deduction (e.g., on refund/cancel).
 */
export async function reverseInventoryForOrder(orderId: string): Promise<void> {
  const supabase = getSupabaseAdminClient() as any;

  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId)
    .not("product_id", "is", null);

  if (!items?.length) return;

  for (const item of items) {
    if (!item.product_id) continue;

    const { data: product } = await supabase
      .from("products")
      .select("track_inventory, stock_qty")
      .eq("id", item.product_id)
      .single();

    if (!product?.track_inventory) continue;

    const newQty = (parseFloat(product.stock_qty) || 0) + parseFloat(item.quantity);

    await supabase
      .from("products")
      .update({ stock_qty: newQty })
      .eq("id", item.product_id);

    await supabase.from("inventory_adjustments").insert({
      product_id: item.product_id,
      adjustment_qty: parseFloat(item.quantity),
      new_qty: newQty,
      reason: "manual",
      reference_id: orderId,
      notes: `Refund/cancel: ${item.quantity} returned (Order ${orderId.slice(0, 8)})`,
    });
  }
}
