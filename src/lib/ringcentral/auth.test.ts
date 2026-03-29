import { normalizePhone, phoneDigits } from "@/lib/ringcentral/auth";

describe("normalizePhone", () => {
  test("10-digit number → +1 prefix", () => {
    expect(normalizePhone("6318746244")).toBe("+16318746244");
  });

  test("10-digit with formatting → +1 prefix", () => {
    expect(normalizePhone("(631) 874-6244")).toBe("+16318746244");
  });

  test("11-digit starting with 1 → + prefix", () => {
    expect(normalizePhone("16318746244")).toBe("+16318746244");
  });

  test("already E.164 format → pass through", () => {
    expect(normalizePhone("+16318746244")).toBe("+16318746244");
  });

  test("international number with + → pass through", () => {
    expect(normalizePhone("+442071234567")).toBe("+442071234567");
  });

  test("too short → null", () => {
    expect(normalizePhone("555123")).toBeNull();
  });

  test("empty string → null", () => {
    expect(normalizePhone("")).toBeNull();
  });

  test("letters only → null", () => {
    expect(normalizePhone("abcdefghij")).toBeNull();
  });

  test("9 digits → null", () => {
    expect(normalizePhone("631874624")).toBeNull();
  });

  test("dashes and spaces stripped", () => {
    expect(normalizePhone("631-874-6244")).toBe("+16318746244");
    expect(normalizePhone("631 874 6244")).toBe("+16318746244");
  });

  test("11 digits not starting with 1 → null", () => {
    expect(normalizePhone("26318746244")).toBeNull();
  });
});

describe("phoneDigits", () => {
  test("extracts last 10 digits from E.164", () => {
    expect(phoneDigits("+16318746244")).toBe("6318746244");
  });

  test("extracts last 10 from formatted", () => {
    expect(phoneDigits("(631) 874-6244")).toBe("6318746244");
  });

  test("handles raw 10 digits", () => {
    expect(phoneDigits("6318746244")).toBe("6318746244");
  });

  test("strips country code from 11-digit", () => {
    expect(phoneDigits("16318746244")).toBe("6318746244");
  });

  test("short number returns what's available", () => {
    expect(phoneDigits("555-1234")).toBe("5551234");
  });

  test("empty string returns empty", () => {
    expect(phoneDigits("")).toBe("");
  });
});
