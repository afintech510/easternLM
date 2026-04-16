import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function CampaignsPage() {
  const supabase = getSupabaseAdminClient();
  const { data: campaigns } = await (supabase as any)
    .from("mktg_google_campaigns")
    .select("*")
    .eq("brand_id", "eastern-lm")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="px-4 py-2 text-left font-medium">Campaign</th>
            <th className="px-4 py-2 text-left font-medium">Type</th>
            <th className="px-4 py-2 text-left font-medium">Status</th>
            <th className="px-4 py-2 text-left font-medium">Budget/Day</th>
            <th className="px-4 py-2 text-left font-medium">Bidding</th>
          </tr></thead>
          <tbody>
            {(campaigns || []).map((c: any) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="px-4 py-2 font-medium">{c.name}</td>
                <td className="px-4 py-2">{c.type}</td>
                <td className="px-4 py-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.status === "ENABLED" ? "bg-green-100 text-green-700" :
                    c.status === "PAUSED" ? "bg-amber-100 text-amber-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>{c.status}</span>
                </td>
                <td className="px-4 py-2">${((c.budget_cents_daily || 0) / 100).toFixed(0)}</td>
                <td className="px-4 py-2 text-muted-foreground text-xs">{c.bidding_strategy}</td>
              </tr>
            ))}
            {(!campaigns || campaigns.length === 0) && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No campaigns created yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
