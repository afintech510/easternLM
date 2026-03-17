import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseServerClientWithCookies } from "@/lib/supabase/server";
import { verifyYardSession, YARD_COOKIE_NAME } from "@/lib/yard-session";
import POSPage from "@/app/pos/page";

/**
 * Server-side auth gate for the POS register.
 * Renders the full POS only after confirming the user has an appropriate role.
 * No flash of POS content before auth is verified.
 */
export default async function YardRegisterPage() {
  let authorized = false;

  try {
    // Check Supabase session (Google login)
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
        authorized = true;
      }
    }

    // Fall back to PIN session cookie
    if (!authorized) {
      const cookieStore = await cookies();
      const yardCookie = cookieStore.get(YARD_COOKIE_NAME)?.value;
      if (yardCookie) {
        const session = await verifyYardSession(yardCookie);
        if (session && ["admin", "staff", "pos"].includes(session.role)) {
          authorized = true;
        }
      }
    }
  } catch {
    authorized = false;
  }

  if (!authorized) {
    redirect("/yard/login");
  }

  return <POSPage />;
}
