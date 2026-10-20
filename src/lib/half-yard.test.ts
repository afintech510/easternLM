import { calculateLineTotal, waivesHalfYardFee } from "./half-yard";

describe("calculateLineTotal", () => {
  test("adds the flat adder once when qty has a half yard", () => {
    expect(calculateLineTotal(2.5, 3500, 500, true)).toBe(9250);
  });

  test("no adder on whole yards or when disabled", () => {
    expect(calculateLineTotal(2, 3500, 500, true)).toBe(7000);
    expect(calculateLineTotal(2.5, 3500, 500, false)).toBe(8750);
  });
});

describe("waivesHalfYardFee", () => {
  test("GP Landscape charge account and duplicate record", () => {
    expect(waivesHalfYardFee({ first_name: "GP", last_name: "Landscape Design GPL", company_name: "GP Landscape Design", charge_account_name: "GP Landscape Design" })).toBe(true);
    expect(waivesHalfYardFee({ first_name: "GP Landscape Design", last_name: "GPL" })).toBe(true);
  });

  test("tag opt-in", () => {
    expect(waivesHalfYardFee({ first_name: "Jane", tags: ["no-half-yard-fee"] })).toBe(true);
  });

  test("everyone else pays", () => {
    expect(waivesHalfYardFee(null)).toBe(false);
    expect(waivesHalfYardFee({ first_name: "Island", last_name: "Finest Landscape" })).toBe(false);
    expect(waivesHalfYardFee({ first_name: "Walk-in", tags: ["contractor"] })).toBe(false);
  });
});
