import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseServerClientWithCookies } from "@/lib/supabase/server";
import { verifyYardSession, YARD_COOKIE_NAME } from "@/lib/yard-session";
import { ScanPage } from "@/components/yard/scan-page";

export default async function YardScanPage() {
  let staffId = "";

  try {
    const supabase = await getSupabaseServerClientWithCookies();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: account } = await (supabase as any)
        .from("accounts")
        .select("role, is_active")
        .eq("id", user.id)
        .single();

      if (
        account &&
        ["admin", "staff", "pos"].includes(account.role) &&
        account.is_active !== false
      ) {
        staffId = user.id;
      }
    }

    if (!staffId) {
      const cookieStore = await cookies();
      const yardCookie = cookieStore.get(YARD_COOKIE_NAME)?.value;
      if (yardCookie) {
        const session = await verifyYardSession(yardCookie);
        if (session && ["admin", "staff", "pos"].includes(session.role)) {
          staffId = session.id;
        }
      }
    }
  } catch {
    // auth unavailable
  }

  if (!staffId) {
    redirect("/yard/login");
  }

  return <ScanPage staffId={staffId} />;
}
