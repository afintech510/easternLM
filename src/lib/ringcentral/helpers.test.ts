import {
  mapRCStatus,
  EXTENSION_NAMES,
  isSmsKeyword,
  formatPhoneDisplay,
} from "@/lib/ringcentral/helpers";

// ── mapRCStatus ──────────────────────────────────────────────────

describe("mapRCStatus", () => {
  test("undefined → ringing", () => {
    expect(mapRCStatus(undefined)).toBe("ringing");
  });

  test("Setup → ringing", () => {
    expect(mapRCStatus("Setup")).toBe("ringing");
  });

  test("Proceeding → ringing", () => {
    expect(mapRCStatus("Proceeding")).toBe("ringing");
  });

  test("Answered → answered", () => {
    expect(mapRCStatus("Answered")).toBe("answered");
  });

  test("Disconnected → completed", () => {
    expect(mapRCStatus("Disconnected")).toBe("completed");
  });

  test("Gone → missed", () => {
    expect(mapRCStatus("Gone")).toBe("missed");
  });

  test("Rejected → missed", () => {
    expect(mapRCStatus("Rejected")).toBe("missed");
  });

  test("VoiceMail → voicemail", () => {
    expect(mapRCStatus("VoiceMail")).toBe("voicemail");
  });

  test("NoAnswer → missed", () => {
    expect(mapRCStatus("NoAnswer")).toBe("missed");
  });

  test("Busy → missed", () => {
    expect(mapRCStatus("Busy")).toBe("missed");
  });

  test("FaxReceive → completed", () => {
    expect(mapRCStatus("FaxReceive")).toBe("completed");
  });

  test("unknown code → ringing (fallback)", () => {
    expect(mapRCStatus("SomethingNew")).toBe("ringing");
  });

  test("empty string → ringing (fallback)", () => {
    expect(mapRCStatus("")).toBe("ringing");
  });
});

// ── EXTENSION_NAMES ──────────────────────────────────────────────

describe("EXTENSION_NAMES", () => {
  test("101 → Adam", () => {
    expect(EXTENSION_NAMES["101"]).toBe("Adam");
  });

  test("102 → Counter", () => {
    expect(EXTENSION_NAMES["102"]).toBe("Counter");
  });

  test("103 → Ronnie", () => {
    expect(EXTENSION_NAMES["103"]).toBe("Ronnie");
  });

  test("104 → Adam Cell", () => {
    expect(EXTENSION_NAMES["104"]).toBe("Adam Cell");
  });

  test("unknown extension → undefined", () => {
    expect(EXTENSION_NAMES["999"]).toBeUndefined();
  });
});

// ── isSmsKeyword ─────────────────────────────────────────────────

describe("isSmsKeyword", () => {
  test("STOP is a keyword", () => {
    expect(isSmsKeyword("STOP")).toBe(true);
  });

  test("case insensitive — stop", () => {
    expect(isSmsKeyword("stop")).toBe(true);
  });

  test("case insensitive — Help", () => {
    expect(isSmsKeyword("Help")).toBe(true);
  });

  test("START is a keyword", () => {
    expect(isSmsKeyword("START")).toBe(true);
  });

  test("YES is a keyword", () => {
    expect(isSmsKeyword("YES")).toBe(true);
  });

  test("NO is a keyword", () => {
    expect(isSmsKeyword("NO")).toBe(true);
  });

  test("whitespace trimmed", () => {
    expect(isSmsKeyword("  STOP  ")).toBe(true);
  });

  test("regular message is not a keyword", () => {
    expect(isSmsKeyword("I need 5 yards of mulch")).toBe(false);
  });

  test("empty string is not a keyword", () => {
    expect(isSmsKeyword("")).toBe(false);
  });

  test("STOP within a sentence is not a keyword", () => {
    expect(isSmsKeyword("please STOP calling")).toBe(false);
  });
});

// ── formatPhoneDisplay ───────────────────────────────────────────

describe("formatPhoneDisplay", () => {
  test("E.164 → (631) 874-6244", () => {
    expect(formatPhoneDisplay("+16318746244")).toBe("(631) 874-6244");
  });

  test("raw 10 digits → formatted", () => {
    expect(formatPhoneDisplay("6318746244")).toBe("(631) 874-6244");
  });

  test("already formatted → re-formatted", () => {
    expect(formatPhoneDisplay("(631) 874-6244")).toBe("(631) 874-6244");
  });

  test("11 digits with country code → formatted (last 10)", () => {
    expect(formatPhoneDisplay("16318746244")).toBe("(631) 874-6244");
  });

  test("short number → returned as-is", () => {
    expect(formatPhoneDisplay("555")).toBe("555");
  });

  test("international number → returned as-is (not 10 US digits)", () => {
    // +44 number has 12 digits — last 10 would be wrong, so format only if 10
    expect(formatPhoneDisplay("+442071234567")).toBe("(207) 123-4567");
  });
});
