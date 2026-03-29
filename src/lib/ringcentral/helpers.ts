/**
 * Pure helper functions for RingCentral integration.
 * Extracted for testability — no side effects or I/O.
 */

/** Extension ID → display name mapping */
export const EXTENSION_NAMES: Record<string, string> = {
  "101": "Adam",
  "102": "Counter",
  "103": "Ronnie",
  "104": "Adam Cell",
};

/** Map RingCentral telephony status codes to our call_records status enum. */
export function mapRCStatus(code: string | undefined): string {
  if (!code) return "ringing";
  const map: Record<string, string> = {
    Setup: "ringing",
    Proceeding: "ringing",
    Answered: "answered",
    Disconnected: "completed",
    Gone: "missed",
    Rejected: "missed",
    VoiceMail: "voicemail",
    NoAnswer: "missed",
    Busy: "missed",
    FaxReceive: "completed",
  };
  return map[code] ?? "ringing";
}

/** Determine if an SMS text is a keyword command (STOP, HELP, etc.) */
export function isSmsKeyword(text: string): boolean {
  const upper = text.trim().toUpperCase();
  return ["STOP", "HELP", "START", "YES", "NO"].includes(upper);
}

/** Format a phone number for display: (631) 874-6244 */
export function formatPhoneDisplay(phone: string): string {
  const d = phone.replace(/\D/g, "").slice(-10);
  if (d.length === 10)
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return phone;
}
