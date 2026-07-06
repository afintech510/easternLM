import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PavingServicePage } from "@/components/services/paving-service-page";
import { getSiteServiceBySlug } from "@/lib/data/site-services";

const SLUG = "private-road-maintenance";
const service = getSiteServiceBySlug(SLUG);

export const metadata: Metadata = service
  ? {
      title: service.metaTitle,
      description: service.metaDescription,
      alternates: { canonical: `/${service.slug}` },
      openGraph: { title: service.ogTitle, description: service.ogDescription, type: "website" },
    }
  : {};

export default function PrivateRoadMaintenancePage() {
  if (!service) notFound();
  return <PavingServicePage service={service} />;
}
