import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseServerClientWithCookies } from "@/lib/supabase/server";
import { verifyYardSession, YARD_COOKIE_NAME } from "@/lib/yard-session";

type AdminAuth = { userId: string; role: string };

/**
 * Verifies the current request is from an authenticated admin user.
 * Use at the top of every admin API route.
 */
export async function requireAdmin(): Promise<AdminAuth | NextResponse> {
  const supabase = await getSupabaseServerClientWithCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: account } = await (supabase as any)
    .from("accounts")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!account || account.role !== "admin" || account.is_active === false) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  return { userId: user.id, role: "admin" };
}

/**
 * Verifies admin OR staff role. For APIs accessible to yard staff.
 */
export async function requireStaff(): Promise<AdminAuth | NextResponse> {
  const supabase = await getSupabaseServerClientWithCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: account } = await (supabase as any)
    .from("accounts")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!account || !["admin", "staff"].includes(account.role) || account.is_active === false) {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }

  return { userId: user.id, role: account.role };
}

/**
 * Verifies admin, staff, OR pos role. Also accepts PIN-based yard_session cookies.
 * Use for POS API routes.
 */
export async function requirePOS(): Promise<AdminAuth | NextResponse> {
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

    if (account && ["admin", "staff", "pos"].includes(account.role) && account.is_active !== false) {
      return { userId: user.id, role: account.role };
    }
  }

  // Fall back to yard_session cookie (PIN login)
  const cookieStore = await cookies();
  const yardCookie = cookieStore.get(YARD_COOKIE_NAME)?.value;
  if (yardCookie) {
    const session = await verifyYardSession(yardCookie);
    if (session && ["admin", "staff", "pos"].includes(session.role)) {
      return { userId: session.id, role: session.role };
    }
  }

  return NextResponse.json({ error: "POS access required" }, { status: 403 });
}

/**
 * Generic role check — accepts any combination of allowed roles.
 */
export async function requireRole(allowedRoles: string[]): Promise<AdminAuth | NextResponse> {
  const supabase = await getSupabaseServerClientWithCookies();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: account } = await (supabase as any)
    .from("accounts")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!account || !allowedRoles.includes(account.role) || account.is_active === false) {
    return NextResponse.json(
      { error: `Access requires one of: ${allowedRoles.join(", ")}` },
      { status: 403 },
    );
  }

  return { userId: user.id, role: account.role };
}
