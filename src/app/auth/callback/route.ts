import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ADMIN_EMAILS = [
  "adam@easternbuilding.supply",
  "ronnie@easternbuilding.supply",
  "office@easternbuilding.supply",
];

function getOrigin(request: Request): string {
  // Behind nginx/Docker, request.url has the container-internal host.
  // Build the real origin from forwarded headers.
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host && !host.includes("localhost")) {
    return `${proto}://${host}`;
  }
  // Fallback to env or request URL
  return process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getOrigin(request);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  if (!code) {
    return NextResponse.redirect(new URL("/admin/login?error=no_code", origin));
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) =>
          cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/admin/login?error=auth_failed", origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/admin/login?error=no_user", origin));
  }

  const email = user.email?.toLowerCase() ?? "";

  // Auto-provision known admin emails on first login
  if (ADMIN_EMAILS.includes(email)) {
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } },
    );
    await (supabaseAdmin as any).from("accounts").upsert(
      {
        id: user.id,
        full_name: user.user_metadata?.full_name ?? user.email,
        role: "admin",
        is_active: true,
      },
      { onConflict: "id" },
    );
    return NextResponse.redirect(new URL("/admin", origin));
  }

  // Check existing account record
  const { data: account } = await (supabase as any)
    .from("accounts")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!account || account.is_active === false) {
    await supabase.auth.signOut();
    // Determine which unauthorized page based on the next param
    const unauthorizedPath = next.startsWith("/yard")
      ? "/yard/unauthorized"
      : "/admin/unauthorized";
    return NextResponse.redirect(new URL(unauthorizedPath, origin));
  }

  // Route based on role
  if (account.role === "admin") {
    return NextResponse.redirect(new URL("/admin", origin));
  }
  if (account.role === "staff" || account.role === "pos") {
    return NextResponse.redirect(new URL("/yard/register", origin));
  }

  // Any other role (customer, pro) — not authorized for internal tools
  await supabase.auth.signOut();
  const unauthorizedPath = next.startsWith("/yard")
    ? "/yard/unauthorized"
    : "/admin/unauthorized";
  return NextResponse.redirect(new URL(unauthorizedPath, origin));
}
