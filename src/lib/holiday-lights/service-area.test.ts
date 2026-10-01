import type { GeocodeResult } from "@/lib/google-maps";
import { decideServiceArea, extractZip, townForZip } from "./service-area";

function geo(over: Partial<GeocodeResult>): GeocodeResult {
  return {
    formattedAddress: "x",
    lat: 40.8,
    lng: -72.8,
    town: null,
    locality: null,
    county: "Suffolk County",
    state: "NY",
    zip: null,
    ...over,
  };
}

describe("townForZip", () => {
  it("maps ZIPs in the four towns", () => {
    expect(townForZip("11934")).toBe("Brookhaven"); // Center Moriches
    expect(townForZip("11901")).toBe("Riverhead");
    expect(townForZip("11957")).toBe("Southold"); // Orient
    expect(townForZip("11946")).toBe("Southampton"); // Hampton Bays
  });
  it("excludes East Hampton, Shelter Island and western Suffolk", () => {
    expect(townForZip("11937")).toBeNull(); // East Hampton
    expect(townForZip("11964")).toBeNull(); // Shelter Island
    expect(townForZip("11706")).toBeNull(); // Bay Shore (Islip)
  });
});

describe("extractZip", () => {
  it("takes the last 5-digit group", () => {
    expect(extractZip("110 Frowein Rd, Center Moriches, NY 11934")).toBe("11934");
    expect(extractZip("12345 Main St, Riverhead NY 11901-1234")).toBe("11901");
    expect(extractZip("no zip here")).toBeNull();
  });
});

describe("decideServiceArea", () => {
  it("accepts by geocoded town", () => {
    const r = decideServiceArea("x", geo({ town: "Brookhaven", zip: "11741" }));
    expect(r).toMatchObject({ inArea: true, town: "Brookhaven", method: "geocode" });
  });

  it("rejects an out-of-area town even when the ZIP is ambiguous", () => {
    const r = decideServiceArea("Sag Harbor", geo({ town: "East Hampton", zip: "11963" }));
    expect(r).toMatchObject({ inArea: false, town: null, method: "geocode" });
  });

  it("rejects the same town name outside Suffolk", () => {
    const r = decideServiceArea("x", geo({ town: "Southampton", county: "Bucks County", state: "PA" }));
    expect(r.inArea).toBe(false);
  });

  it("falls back to the ZIP list when geocoding fails", () => {
    expect(decideServiceArea("1 Main St, Mattituck NY 11952", null)).toMatchObject({ inArea: true, town: "Southold", method: "zip" });
    expect(decideServiceArea("1 Main St, Montauk NY 11954", null)).toMatchObject({ inArea: false, method: "zip" });
    expect(decideServiceArea("somewhere", null)).toMatchObject({ inArea: false, method: "none" });
  });

  it("uses the ZIP when the geocode has no town component", () => {
    const r = decideServiceArea("x", geo({ zip: "11968" }));
    expect(r).toMatchObject({ inArea: true, town: "Southampton", method: "zip" });
  });
});
