/**
 * Known reminder senders — Adam & Ronnie.
 * The reminder queue only reacts to texts from these numbers; everything else
 * keeps today's behavior (service lead / opt-out keyword).
 */

import { phoneDigits } from "@/lib/ringcentral/auth";

export interface ReminderUser {
  name: string;
  /** E.164 number to send digests to. */
  phone: string;
}

// Hardcoded fallback so the feature works without env changes.
// Keyed by last-10-digits for fuzzy matching against inbound senders.
const DEFAULT_USERS: Record<string, ReminderUser> = {
  "6314008080": { name: "Adam", phone: "+16314008080" },
  "6313840843": { name: "Ronnie", phone: "+16313840843" },
};

/**
 * Resolve the reminder user map, seeded from REMINDER_USER_NUMBERS (JSON) when
 * present, else the hardcoded default. Env shape:
 *   {"6314008080":"Adam","6313840843":"Ronnie"}
 */
export function getReminderUsers(): Record<string, ReminderUser> {
  const raw = process.env.REMINDER_USER_NUMBERS;
  if (!raw) return DEFAULT_USERS;

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    const map: Record<string, ReminderUser> = {};
    for (const [num, name] of Object.entries(parsed)) {
      const digits = phoneDigits(num);
      if (digits.length === 10) {
        map[digits] = { name, phone: `+1${digits}` };
      }
    }
    return Object.keys(map).length > 0 ? map : DEFAULT_USERS;
  } catch {
    return DEFAULT_USERS;
  }
}

/** Resolve an inbound sender number to a known reminder user, or null. */
export function resolveReminderUser(fromNumber: string): ReminderUser | null {
  const digits = phoneDigits(fromNumber);
  return getReminderUsers()[digits] ?? null;
}
