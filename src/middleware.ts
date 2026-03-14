import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Check legacy redirects first (301 permanent) ─────────────
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
    return NextResponse.redirect(url, 301);
  }

  const { supabase, response } = createSupabaseMiddlewareClient(request);

  // Refresh the session on every request
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // Only protect /admin routes (except login page and login API)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && pathname !== "/api/admin/login") {
    if (!user) {
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
