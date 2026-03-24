import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getClient() {
  if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase env vars for tests");
  return createClient(supabaseUrl, supabaseKey);
}

export async function getLatestOrder() {
  const { data } = await getClient()
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data;
}

export async function getOrderByName(name: string) {
  const { data } = await getClient()
    .from("orders")
    .select("*, order_items(*)")
    .ilike("customer_name", `%${name}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data;
}

export async function getLatestWebOrder() {
  const { data } = await getClient()
    .from("orders")
    .select("*, order_items(*)")
    .eq("source", "web")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data;
}

export async function deleteTestOrders(prefix: string) {
  await getClient().from("orders").delete().ilike("customer_name", `${prefix}%`);
}
