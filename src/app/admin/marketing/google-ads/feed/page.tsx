import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function FeedPage() {
  const supabase = getSupabaseAdminClient();
  const { data: products } = await (supabase as any)
    .from("mktg_google_products")
    .select("gmc_offer_id, channel, last_synced_at, last_sync_status, disapproval_reason")
    .eq("brand_id", "eastern-lm")
    .order("gmc_offer_id");

  const total = products?.length || 0;
  const approved = products?.filter((p: any) => p.last_sync_status === "approved").length || 0;
  const pending = products?.filter((p: any) => p.last_sync_status === "pending").length || 0;
  const disapproved = products?.filter((p: any) => p.last_sync_status === "disapproved").length || 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Total Offers</p><p className="text-2xl font-bold">{total}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Approved</p><p className="text-2xl font-bold text-green-600">{approved}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold text-amber-600">{pending}</p></div>
        <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">Disapproved</p><p className="text-2xl font-bold text-red-600">{disapproved}</p></div>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50"><th className="px-4 py-2 text-left font-medium">Offer ID</th><th className="px-4 py-2 text-left font-medium">Channel</th><th className="px-4 py-2 text-left font-medium">Status</th><th className="px-4 py-2 text-left font-medium">Last Synced</th></tr></thead>
          <tbody>
            {(products || []).map((p: any) => (
              <tr key={p.gmc_offer_id} className="border-b last:border-0">
                <td className="px-4 py-2 font-mono text-xs">{p.gmc_offer_id}</td>
                <td className="px-4 py-2">{p.channel}</td>
                <td className="px-4 py-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.last_sync_status === "approved" ? "bg-green-100 text-green-700" :
                    p.last_sync_status === "disapproved" ? "bg-red-100 text-red-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>{p.last_sync_status || "pending"}</span>
                </td>
                <td className="px-4 py-2 text-muted-foreground">{p.last_synced_at ? new Date(p.last_synced_at).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
