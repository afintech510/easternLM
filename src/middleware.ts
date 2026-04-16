import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";
import { verifyYardSession, YARD_COOKIE_NAME } from "@/lib/yard-session";

// ─── Legacy URL redirects (old GoDaddy site + WooCommerce) ────────
const LEGACY_REDIRECTS: Record<string, string> = {
  "/driveways": "/services/driveways",
  "/landscaping": "/services/landscaping",
  "/masonry": "/services/masonry",
  "/property-maintenance": "/services/property-maintenance",
  "/my-account": "/account/orders",
  "/my-account/": "/account/orders",
  "/shop/": "/shop",
  "/cart/": "/cart",
  "/checkout/": "/checkout",
  "/contact/": "/contact",
  // Old POS URL → new obscured URL
  "/pos": "/yard/register",
};

// WooCommerce product URL pattern: /product/{slug}
// WooCommerce category pattern: /product-category/{slug}
function getLegacyRedirect(pathname: string): string | null {
  // Exact match
  if (LEGACY_REDIRECTS[pathname]) return LEGACY_REDIRECTS[pathname];

  // WooCommerce product → shop product
  const productMatch = pathname.match(/^\/product\/([^/]+)\/?$/);
  if (productMatch) return `/shop/${productMatch[1]}`;

  // WooCommerce category → shop with filter
  const categoryMatch = pathname.match(/^\/product-category\/([^/]+)\/?$/);
  if (categoryMatch) return `/shop?category=${categoryMatch[1]}`;

  return null;
}

// Routes that don't require auth even within protected prefixes
const YARD_PUBLIC = ["/yard/login", "/yard/unauthorized"];
const ADMIN_PUBLIC = ["/admin/login", "/admin/unauthorized", "/api/admin/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Check legacy redirects first (307 redirect) ────────────────
  const redirect = getLegacyRedirect(pathname);
  if (redirect) {
    const url = request.nextUrl.clone();
    if (redirect.includes("?")) {
      const [path, query] = redirect.split("?");
      url.pathname = path;
      url.search = `?${query}`;
    } else {
      url.pathname = redirect;
    }
    return NextResponse.redirect(url, 307);
  }

  // ─── GCLID capture (Google Ads click attribution) ────────────────
  const gclid = request.nextUrl.searchParams.get("gclid");
  if (gclid) {
    // Strip gclid from URL and set cookie
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete("gclid");
    const redirectResponse = NextResponse.redirect(cleanUrl, 302);
    redirectResponse.cookies.set("elm_gclid", gclid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 90 * 24 * 60 * 60, // 90 days
      path: "/",
    });
    return redirectResponse;
  }

  const { supabase, response } = createSupabaseMiddlewareClient(request);

  // Refresh Supabase session on every request
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ─── Admin routes ──────────────────────────────────────────────────
  if (pathname.startsWith("/admin") && !ADMIN_PUBLIC.some((p) => pathname.startsWith(p))) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }

    const { data: account } = await supabase
      .from("accounts" as any)
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (!account || (account as any).role !== "admin" || (account as any).is_active === false) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/unauthorized";
      if (pathname !== "/admin/unauthorized") return NextResponse.redirect(url);
    }
  }

  // ─── Yard routes ───────────────────────────────────────────────────
  if (pathname.startsWith("/yard") && !YARD_PUBLIC.some((p) => pathname.startsWith(p))) {
    // Check Supabase session (admin / staff)
    if (user) {
      const { data: account } = await supabase
        .from("accounts" as any)
        .select("role, is_active")
        .eq("id", user.id)
        .single();

      if (
        account &&
        ["admin", "staff", "pos"].includes((account as any).role) &&
        (account as any).is_active !== false
      ) {
        return response; // ✅ authorized via Supabase session
      }
    }

    // Check yard_session cookie (PIN login)
    const yardCookie = request.cookies.get(YARD_COOKIE_NAME)?.value;
    if (yardCookie) {
      const session = await verifyYardSession(yardCookie);
      if (session && ["admin", "staff", "pos"].includes(session.role)) {
        return response; // ✅ authorized via PIN session
      }
    }

    // Not authorized — redirect to yard login
    const url = request.nextUrl.clone();
    url.pathname = "/yard/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
