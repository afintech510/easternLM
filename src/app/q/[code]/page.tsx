import { redirect, notFound } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function ShortQuotePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any;
  const { data: quote } = await supabase
    .from("quotes")
    .select("public_token")
    .eq("short_code", code.toUpperCase())
    .maybeSingle();

  if (!quote?.public_token) notFound();

  redirect(`/quote/${quote.public_token}`);
}
