/**
 * POS delivery-fee lookup.
 *
 * The register and the quote builder used to re-implement the fee formula with
 * hard-coded constants (6 MPG, $5/gal, $32/hr, x2, $25 minimum), so edits made in
 * Admin → Settings never reached the POS. Both now go through this helper, which
 * takes the fee the server computed from the site_settings values.
 */

export type PosRouteInfo = {
  roundTripMiles: number;
  roundTripMinutes: number;
  oneWayDurationSeconds: number;
  oneWayDistanceMeters: number;
};

export type PosDeliveryQuote = {
  routeInfo: PosRouteInfo;
  feeCents: number;
  outsideServiceArea: boolean;
  isLocal: boolean;
};

/**
 * Resolve the delivery fee for an address. Returns null when the address can't be
 * priced (bad address, Maps unavailable) so callers can fall back to manual entry.
 */
export async function quoteDeliveryFee(address: string): Promise<PosDeliveryQuote | null> {
  try {
    const res = await fetch("/api/delivery/distance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (typeof data.firstLoadFeeCents !== "number") return null;

    const oneWayMiles = data.distanceMeters / 1609.344;
    const dumpBufferMinutes = typeof data.dumpTimeBufferMinutes === "number" ? data.dumpTimeBufferMinutes : 5;

    return {
      routeInfo: {
        roundTripMiles: Math.round(oneWayMiles * 2 * 10) / 10,
        roundTripMinutes: Math.round((data.durationSeconds * 2 + dumpBufferMinutes * 60) / 60),
        oneWayDurationSeconds: data.durationSeconds,
        oneWayDistanceMeters: data.distanceMeters,
      },
      feeCents: data.firstLoadFeeCents,
      outsideServiceArea: !!data.outsideServiceArea,
      isLocal: !!data.isLocal,
    };
  } catch {
    return null;
  }
}
