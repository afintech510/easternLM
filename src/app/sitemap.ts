import type { MetadataRoute } from "next";
import { getAllBlogPosts } from "@/lib/data/blog";
import { getTownPages } from "@/lib/data/town-pages";
import { getShopCatalog } from "@/lib/data/catalog";

function resolveBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) {
    return "http://localhost:3000";
  }

  try {
    return new URL(raw).origin;
  } catch {
    try {
      return new URL(`https://${raw}`).origin;
    } catch {
      return "http://localhost:3000";
    }
  }
}

const baseUrl = resolveBaseUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [towns, blogPosts, catalog] = await Promise.all([getTownPages(), getAllBlogPosts(), getShopCatalog()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/about",
    "/shop",
    "/services",
    "/gallery",
    "/delivery",
    "/blog",
    "/blog/materials-guide",
    "/calculator",
    "/contact",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.7,
    lastModified: new Date(),
  }));

  const serviceRoutes: MetadataRoute.Sitemap = [
    "/services/landscaping",
    "/services/masonry",
    "/services/driveways",
    "/services/property-maintenance",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    changeFrequency: "monthly",
    priority: 0.75,
    lastModified: new Date(),
  }));

  const townRoutes: MetadataRoute.Sitemap = towns.map((town) => ({
    url: `${baseUrl}/delivery/${town.slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
    lastModified: new Date(),
  }));

  const productRoutes: MetadataRoute.Sitemap = catalog.products.map((product) => ({
    url: `${baseUrl}/shop/${product.slug}`,
    changeFrequency: "weekly",
    priority: 0.75,
    lastModified: new Date(),
  }));

  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    changeFrequency: "monthly",
    priority: 0.72,
    lastModified: new Date(post.date),
  }));

  return [...staticRoutes, ...serviceRoutes, ...townRoutes, ...productRoutes, ...blogRoutes];
}
