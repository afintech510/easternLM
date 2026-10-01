import { TOWNS, type HolidayTown } from "@/config/holiday-lights";
import { geocodeAddress, type GeocodeResult } from "@/lib/google-maps";

/**
 * Tinsel Time service area: all of the Towns of Brookhaven, Riverhead, Southold
 * and Southampton (no surcharge). Shelter Island, East Hampton and western Suffolk
 * go to the waitlist.
 *
 * Primary check is the geocoded town (administrative_area_level_3). The ZIP
 * allowlist is the fallback when geocoding fails or returns no town. ZIPs split
 * with an out-of-area town (Holbrook, Ronkonkoma, Sag Harbor…) are left out on
 * purpose — the geocoder decides those.
 */

export const SERVICE_AREA_ZIPS: Record<HolidayTown, readonly string[]> = {
  Brookhaven: [
    "11713", "11715", "11719", "11720", "11727", "11733", "11738", "11742", "11755",
    "11763", "11764", "11766", "11772", "11776", "11777", "11778", "11784", "11786",
    "11789", "11790", "11794", "11934", "11940", "11950", "11951", "11953", "11955",
    "11961", "11967", "11980",
  ],
  Riverhead: ["11901", "11931", "11933", "11947", "11949", "11792"],
  Southold: ["11935", "11939", "11944", "11948", "11952", "11956", "11957", "11958", "11971", "06390"],
  Southampton: [
    "11932", "11941", "11942", "11946", "11959", "11960", "11962", "11968", "11969",
    "11972", "11976", "11977", "11978",
  ],
};

const ZIP_TO_TOWN = new Map<string, HolidayTown>(
  (Object.entries(SERVICE_AREA_ZIPS) as [HolidayTown, readonly string[]][]).flatMap(([town, zips]) =>
    zips.map((z) => [z, town] as const),
  ),
);

export type ServiceAreaResult = {
  inArea: boolean;
  town: HolidayTown | null;
  method: "geocode" | "zip" | "none";
  zip: string | null;
  lat: number | null;
  lng: number | null;
  formattedAddress: string | null;
};

function normalizeTown(name: string | null): HolidayTown | null {
  if (!name) return null;
  const clean = name.replace(/^Town of\s+/i, "").replace(/\s+Town$/i, "").trim().toLowerCase();
  return TOWNS.find((t) => t.toLowerCase() === clean) ?? null;
}

export function townForZip(zip: string | null | undefined): HolidayTown | null {
  if (!zip) return null;
  const five = zip.trim().slice(0, 5);
  return ZIP_TO_TOWN.get(five) ?? null;
}

export function extractZip(address: string): string | null {
  const m = address.match(/\b(\d{5})(?:-\d{4})?\b(?!.*\b\d{5}\b)/);
  return m ? m[1] : null;
}

/** Pure decision from a geocode result (or null) + the raw address. */
export function decideServiceArea(address: string, geo: GeocodeResult | null): ServiceAreaResult {
  const zip = geo?.zip ?? extractZip(address);
  const base = {
    zip,
    lat: geo?.lat ?? null,
    lng: geo?.lng ?? null,
    formattedAddress: geo?.formattedAddress ?? null,
  };

  if (geo) {
    const inSuffolk = geo.state === "NY" && (geo.county ?? "").toLowerCase().startsWith("suffolk");
    if (geo.town) {
      const town = inSuffolk ? normalizeTown(geo.town) : null;
      return { ...base, inArea: !!town, town, method: "geocode" };
    }
    // No town component: a Suffolk locality that *is* one of the towns (e.g. "Riverhead") still counts.
    const byLocality = inSuffolk ? normalizeTown(geo.locality) : null;
    if (byLocality) return { ...base, inArea: true, town: byLocality, method: "geocode" };
    if (geo.state && geo.state !== "NY") return { ...base, inArea: false, town: null, method: "geocode" };
  }

  const byZip = townForZip(zip);
  if (byZip) return { ...base, inArea: true, town: byZip, method: "zip" };
  return { ...base, inArea: false, town: null, method: zip ? "zip" : "none" };
}

export async function isInServiceArea(address: string): Promise<ServiceAreaResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  let geo: GeocodeResult | null = null;
  if (apiKey) {
    try {
      geo = await geocodeAddress(address, apiKey);
    } catch (err) {
      console.warn("[holiday-lights] geocode failed, using ZIP fallback:", err);
    }
  }
  return decideServiceArea(address, geo);
}
