import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PavingServiceTownPage } from "@/components/services/paving-service-town-page";
import { getSiteServiceBySlug } from "@/lib/data/site-services";
import { getServiceTownEntry, getVerifiedServiceTowns } from "@/lib/data/site-service-towns";

const SLUG = "private-road-maintenance";

// Gate layer 2: only verified towns are pre-built; anything else 404s.
export const dynamicParams = false;

export function generateStaticParams() {
  return getVerifiedServiceTowns(SLUG).map((e) => ({ town: e.townSlug }));
}

type PageProps = { params: Promise<{ town: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { town } = await params;
  const service = getSiteServiceBySlug(SLUG);
  const entry = getServiceTownEntry(SLUG, town);
  if (!service || !entry || !entry.verified) return {};
  return {
    title: `${service.schemaName} in ${entry.townName}, NY | Eastern LM`,
    description: `${service.schemaName} in ${entry.townName}, New York — ${service.ogDescription} Free estimates.`,
    alternates: { canonical: `/${SLUG}/${entry.townSlug}` },
    openGraph: {
      title: `${service.schemaName} in ${entry.townName}, NY`,
      description: service.ogDescription,
      type: "website",
    },
  };
}

export default async function PrivateRoadMaintenanceTownPage({ params }: PageProps) {
  const { town } = await params;
  const service = getSiteServiceBySlug(SLUG);
  const entry = getServiceTownEntry(SLUG, town);
  // Gate layer 3: runtime guard.
  if (!service || !entry || !entry.verified) notFound();
  return <PavingServiceTownPage service={service} entry={entry} />;
}
