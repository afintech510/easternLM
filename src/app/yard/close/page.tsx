import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseServerClientWithCookies } from "@/lib/supabase/server";
import { verifyYardSession, YARD_COOKIE_NAME } from "@/lib/yard-session";
import PosCloseDayPage from "@/app/pos/close/page";

export default async function YardClosePage() {
  let authorized = false;
  try {
    const supabase = await getSupabaseServerClientWithCookies();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: account } = await (supabase as any).from("accounts").select("role, is_active").eq("id", user.id).single();
      if (account && ["admin", "staff"].includes(account.role) && account.is_active !== false) authorized = true;
    }
    if (!authorized) {
      const cookieStore = await cookies();
      const yardCookie = cookieStore.get(YARD_COOKIE_NAME)?.value;
      if (yardCookie) {
        const session = await verifyYardSession(yardCookie);
        if (session && ["admin", "staff"].includes(session.role)) authorized = true;
      }
    }
  } catch { authorized = false; }
  if (!authorized) redirect("/yard/login");
  return <PosCloseDayPage />;
}
