import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PavingServicePage } from "@/components/services/paving-service-page";
import { getSiteServiceBySlug } from "@/lib/data/site-services";

const SLUG = "tree-removal-trimming";
const service = getSiteServiceBySlug(SLUG);

export const metadata: Metadata = service
  ? {
      title: service.metaTitle,
      description: service.metaDescription,
      alternates: { canonical: `/${service.slug}` },
      openGraph: { title: service.ogTitle, description: service.ogDescription, type: "website" },
    }
  : {};

export default function TreeRemovalTrimmingPage() {
  if (!service) notFound();
  return <PavingServicePage service={service} />;
}
