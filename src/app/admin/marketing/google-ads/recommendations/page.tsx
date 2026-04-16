import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function RecommendationsPage() {
  const supabase = getSupabaseAdminClient();
  const { data: recs } = await (supabase as any)
    .from("mktg_google_recommendations")
    .select("*")
    .eq("brand_id", "eastern-lm")
    .order("created_at", { ascending: false })
    .limit(50);

  const pending = recs?.filter((r: any) => r.status === "pending") || [];
  const history = recs?.filter((r: any) => r.status !== "pending") || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Pending Recommendations</h2>
        <p className="text-sm text-muted-foreground">{pending.length} recommendations awaiting review</p>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          No pending recommendations. The optimizer runs daily at 6 AM.
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((rec: any) => (
            <div key={rec.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{rec.type}</span>
                <span className="text-xs text-muted-foreground">{new Date(rec.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm">{rec.reason}</p>
              {rec.proposed_change && (
                <pre className="rounded bg-muted p-2 text-xs overflow-auto">{JSON.stringify(rec.proposed_change, null, 2)}</pre>
              )}
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <>
          <h2 className="text-lg font-semibold pt-4">History</h2>
          <div className="space-y-2">
            {history.map((rec: any) => (
              <div key={rec.id} className="rounded-lg border p-3 flex items-center justify-between">
                <div>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium mr-2 ${
                    rec.status === "approved" ? "bg-green-100 text-green-700" :
                    rec.status === "rejected" ? "bg-red-100 text-red-700" :
                    rec.status === "auto_applied" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>{rec.status}</span>
                  <span className="text-sm">{rec.type}: {rec.reason?.slice(0, 80)}</span>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(rec.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
