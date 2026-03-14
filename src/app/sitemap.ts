import type { MetadataRoute } from "next";
import { getAllBlogPosts } from "@/lib/data/blog";
import { getTownPages } from "@/lib/data/town-pages";
import { getShopCatalog } from "@/lib/data/catalog";
import { getProductTownPages, getServiceTownPages } from "@/lib/data/product-town-pages";

function resolveBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return "http://localhost:3000";
  try { return new URL(raw).origin; } catch { try { return new URL(`https://${raw}`).origin; } catch { return "http://localhost:3000"; } }
}

const baseUrl = resolveBaseUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [towns, blogPosts, catalog, productTownPages, serviceTownPages] = await Promise.all([
    getTownPages(), getAllBlogPosts(), getShopCatalog(), getProductTownPages(), getServiceTownPages(),
  ]);

  // ── Static pages ──────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    { path: "", priority: 1.0, freq: "daily" },
    { path: "/shop", priority: 0.9, freq: "daily" },
    { path: "/materials", priority: 0.8, freq: "weekly" },
    { path: "/services", priority: 0.8, freq: "weekly" },
    { path: "/delivery", priority: 0.7, freq: "weekly" },
    { path: "/calculator", priority: 0.7, freq: "weekly" },
    { path: "/contact", priority: 0.6, freq: "monthly" },
    { path: "/about", priority: 0.5, freq: "monthly" },
    { path: "/gallery", priority: 0.5, freq: "weekly" },
    { path: "/blog", priority: 0.5, freq: "weekly" },
    { path: "/privacy-policy", priority: 0.3, freq: "monthly" },
    { path: "/terms", priority: 0.3, freq: "monthly" },
  ].map((r) => ({
    url: `${baseUrl}${r.path}`,
    changeFrequency: r.freq as MetadataRoute.Sitemap[0]["changeFrequency"],
    priority: r.priority,
    lastModified: new Date(),
  }));

  // ── Service pages (4 main) ────────────────────────────
  const serviceRoutes: MetadataRoute.Sitemap = [
    "/services/landscaping", "/services/masonry", "/services/driveways", "/services/property-maintenance",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
    lastModified: new Date(),
  }));

  // ── Product pages ─────────────────────────────────────
  const productRoutes: MetadataRoute.Sitemap = catalog.products.map((product) => ({
    url: `${baseUrl}/shop/${product.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.75,
    lastModified: new Date(),
  }));

  // ── Town delivery pages (65) ──────────────────────────
  const townRoutes: MetadataRoute.Sitemap = towns.map((town) => ({
    url: `${baseUrl}/delivery/${town.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
    lastModified: new Date(),
  }));

  // ── Product × town pages (390) ────────────────────────
  const materialRoutes: MetadataRoute.Sitemap = productTownPages.map((p) => ({
    url: `${baseUrl}/materials/${p.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
    lastModified: new Date(),
  }));

  // ── Service × town pages (112) ────────────────────────
  const serviceTownRoutes: MetadataRoute.Sitemap = serviceTownPages.map((p) => {
    // slug format: "driveways-in-shirley" → /services/driveways/shirley
    const parts = p.slug.match(/^(.+?)-in-(.+)$/);
    const url = parts
      ? `${baseUrl}/services/${parts[1]}/${parts[2]}`
      : `${baseUrl}/services/${p.slug}`;
    return {
      url,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      lastModified: new Date(),
    };
  });

  // ── Blog posts ────────────────────────────────────────
  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.5,
    lastModified: new Date(post.date),
  }));

  return [
    ...staticRoutes,
    ...serviceRoutes,
    ...productRoutes,
    ...townRoutes,
    ...materialRoutes,
    ...serviceTownRoutes,
    ...blogRoutes,
  ];
}
