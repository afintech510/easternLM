import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function ConversionsPage() {
  const supabase = getSupabaseAdminClient();

  // GCLID capture rate
  const { count: totalOrders } = await (supabase as any)
    .from("orders")
    .select("id", { count: "exact", head: true })
    .in("status", ["paid", "delivered", "completed"]);

  const { count: ordersWithGclid } = await (supabase as any)
    .from("orders")
    .select("id", { count: "exact", head: true })
    .in("status", ["paid", "delivered", "completed"])
    .not("gclid", "is", null);

  const captureRate = totalOrders > 0 ? ((ordersWithGclid || 0) / totalOrders * 100).toFixed(1) : "0.0";

  // Upload status summary
  const { data: uploads } = await (supabase as any)
    .from("mktg_google_conversions_uploaded")
    .select("upload_status, order_id")
    .eq("brand_id", "eastern-lm");

  const statusCounts: Record<string, number> = {};
  for (const u of uploads || []) {
    statusCounts[u.upload_status] = (statusCounts[u.upload_status] || 0) + 1;
  }

  // Recent uploads
  const { data: recent } = await (supabase as any)
    .from("mktg_google_conversions_uploaded")
    .select("order_id, gclid, upload_status, uploaded_at, error_message")
    .eq("brand_id", "eastern-lm")
    .order("uploaded_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">GCLID Capture Rate</p>
          <p className="text-2xl font-bold">{captureRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">{ordersWithGclid || 0} of {totalOrders || 0} paid orders</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Uploaded</p>
          <p className="text-2xl font-bold text-green-600">{statusCounts.success || 0}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Failed / Expired</p>
          <p className="text-2xl font-bold text-red-600">{(statusCounts.failed || 0) + (statusCounts.expired || 0)}</p>
        </div>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="px-4 py-2 text-left font-medium">Order</th>
            <th className="px-4 py-2 text-left font-medium">GCLID</th>
            <th className="px-4 py-2 text-left font-medium">Status</th>
            <th className="px-4 py-2 text-left font-medium">Uploaded</th>
          </tr></thead>
          <tbody>
            {(recent || []).map((u: any) => (
              <tr key={u.order_id} className="border-b last:border-0">
                <td className="px-4 py-2 font-mono text-xs">{u.order_id?.slice(0, 8)}</td>
                <td className="px-4 py-2 font-mono text-xs">{u.gclid?.slice(0, 20)}...</td>
                <td className="px-4 py-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    u.upload_status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>{u.upload_status}</span>
                </td>
                <td className="px-4 py-2 text-muted-foreground text-xs">{u.uploaded_at ? new Date(u.uploaded_at).toLocaleString() : "—"}</td>
              </tr>
            ))}
            {(!recent || recent.length === 0) && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No conversions uploaded yet. Uploads run every 15 minutes for orders with GCLID.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
