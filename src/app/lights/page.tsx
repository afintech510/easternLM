import { redirect } from "next/navigation";

/**
 * QR redirect for lawn signs, door hangers and the yard display:
 * /lights?s=<id> → /holiday-lights with lawn-sign UTMs.
 */
export default async function LightsQrRedirect({ searchParams }: { searchParams: Promise<{ s?: string | string[] }> }) {
  const { s } = await searchParams;
  const id = typeof s === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(s) ? s : null;
  const params = new URLSearchParams({ utm_source: "lawn_sign", utm_medium: "qr", utm_campaign: "holiday_lights" });
  if (id) params.set("utm_content", id);
  redirect(`/holiday-lights?${params.toString()}`);
}
