import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabase, response } = createSupabaseMiddlewareClient(request);

  // Refresh the session on every request
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Only protect /admin routes (except login page and login API)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && pathname !== "/api/admin/login") {
    console.log(`[middleware] ${pathname} | user=${user?.id ?? "none"} | userError=${userError?.message ?? "none"}`);

    if (!user) {
      console.log(`[middleware] No user, redirecting to /admin/login`);
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      return NextResponse.redirect(loginUrl);
    }

    // Check admin role
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("role")
      .eq("id", user.id)
      .single();

    console.log(`[middleware] account=${JSON.stringify(account)} | accountError=${accountError?.message ?? "none"}`);

    if (!account || account.role !== "admin") {
      const unauthorizedUrl = request.nextUrl.clone();
      unauthorizedUrl.pathname = "/admin/unauthorized";
      // Allow the unauthorized page itself to render
      if (pathname !== "/admin/unauthorized") {
        return NextResponse.redirect(unauthorizedUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
