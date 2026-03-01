import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { TruckList } from "@/components/admin/trucks/truck-list";

function tryGetAdmin() {
  try {
    return getSupabaseAdminClient();
  } catch {
    return null;
  }
}

export default async function AdminTrucksPage() {
  const supabase = tryGetAdmin();
  let trucks: Array<Record<string, unknown>> = [];

  if (supabase) {
    const { data } = await supabase.from("truck_types").select("*").order("sort_order");
    trucks = (data as Array<Record<string, unknown>>) ?? [];
  }

  return (
    <div className="space-y-6">
      <h1 className="[font-family:var(--font-display)] text-3xl text-primary">Truck Fleet</h1>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <TruckList initialTrucks={trucks as any} />
    </div>
  );
}
