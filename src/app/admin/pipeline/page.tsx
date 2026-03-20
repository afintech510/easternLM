export const dynamic = "force-dynamic";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { PipelineBoard } from "@/components/admin/pipeline/pipeline-board";

function tryGetAdmin() {
  try { return getSupabaseAdminClient(); } catch { return null; }
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
  const params = await searchParams;
  const supabase = tryGetAdmin() as any;

  // Fetch leads with linked quote info
  let query = supabase
    .from("service_leads")
    .select("*, quotes:quote_id(id, quote_number, public_token, total_cents, status, sent_at, viewed_at, accepted_at)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (params.type && params.type !== "all") {
    query = query.eq("lead_type", params.type);
  }
  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data: leads } = await query;

  // Stats
  const allLeads = leads ?? [];
  const activeLeads = allLeads.filter((l: any) => !["won", "lost", "expired"].includes(l.status));
  const quotedLeads = allLeads.filter((l: any) => l.quote_id);
  const pipelineValue = activeLeads.reduce((s: number, l: any) => s + (l.estimated_value_cents ?? 0), 0);
  const wonLeads = allLeads.filter((l: any) => l.status === "won");
  const wonValue = wonLeads.reduce((s: number, l: any) => s + (l.estimated_value_cents ?? 0), 0);
  const conversionRate = allLeads.length > 0 ? Math.round((wonLeads.length / allLeads.length) * 100) : 0;

  return (
    <PipelineBoard
      initialLeads={(leads ?? []) as any[]}
      initialType={params.type ?? "all"}
      stats={{
        activeCount: activeLeads.length,
        quotedCount: quotedLeads.length,
        pipelineValueCents: pipelineValue,
        wonValueCents: wonValue,
        conversionRate,
      }}
    />
  );
}
