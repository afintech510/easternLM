import { createHash } from "node:crypto";

export function normalizeAddress(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function hashAddress(value: string) {
  return createHash("sha256").update(normalizeAddress(value)).digest("hex");
}
