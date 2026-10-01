import { parseVerdict, verdictToCheck } from "./photo-guard";

describe("parseVerdict", () => {
  it("parses bare JSON", () => {
    expect(parseVerdict('{"house_exterior":true,"people_prominent":false,"inappropriate":false,"reason":"ranch"}')).toEqual({
      house_exterior: true,
      people_prominent: false,
      inappropriate: false,
      reason: "ranch",
    });
  });
  it("tolerates prose around the JSON and a missing reason", () => {
    expect(parseVerdict('Sure:\n{"house_exterior":false,"people_prominent":false,"inappropriate":false}\n')).toMatchObject({
      house_exterior: false,
      reason: "",
    });
  });
  it("returns null for junk or wrong types", () => {
    expect(parseVerdict("no json")).toBeNull();
    expect(parseVerdict('{"house_exterior":"yes"}')).toBeNull();
  });
});

describe("verdictToCheck", () => {
  const ok = { house_exterior: true, people_prominent: false, inappropriate: false, reason: "" };
  it("allows a house exterior", () => {
    expect(verdictToCheck(ok).ok).toBe(true);
  });
  it("blocks non-houses, prominent people and inappropriate content", () => {
    expect(verdictToCheck({ ...ok, house_exterior: false }).ok).toBe(false);
    expect(verdictToCheck({ ...ok, people_prominent: true }).ok).toBe(false);
    expect(verdictToCheck({ ...ok, inappropriate: true }).ok).toBe(false);
  });
});
