import { randomBytes } from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendSms } from "@/lib/sms";
import { HOLIDAY_LIGHTS, getDesignUrl, getSiteOrigin } from "@/config/holiday-lights";
import { DAY_MS, rateLimit } from "@/lib/rate-limit";
import { emailStaff, escapeHtml, formatPhone } from "./notify";
import {
  STYLE_LABELS,
  finalizeResult,
  getPrediction,
  getVisualizerModel,
  startPrediction,
  summarizeExtras,
  type FinalizeIO,
  type VisualizerOptions,
  type VisualizerStyle,
} from "./visualize";

/** Server-side data access + orchestration for holiday_light_designs (visualizer). */

export const BUCKET = "holiday-designs";
export const MAX_GENERATIONS_PER_DESIGN = 3;
export const VISUALIZE_PER_IP_PER_DAY = 5;
const FINALIZE_STALE_MS = 90_000;
/** Give up on a prediction that hasn't finished in 6 minutes (nano-banana-pro can take ~2). */
const GENERATION_TIMEOUT_MS = 6 * 60_000;

export type VisualizerStatus = "uploaded" | "generating" | "finalizing" | "ready" | "failed";

export type HolidayDesign = {
  id: string;
  token: string;
  kind: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  sms_consent: boolean;
  image_path: string | null;
  image_width: number | null;
  image_height: number | null;
  photo_check: Record<string, unknown> | null;
  visualizer_style: VisualizerStyle | null;
  /** Visualizer rows: the last-rendered {style, extras}. Build & Book rows: a full BuildInput. */
  build: Record<string, unknown> | null;
  replicate_prediction_id: string | null;
  visualizer_status: VisualizerStatus;
  visualizer_error: string | null;
  generation_count: number;
  visualizer_image_path: string | null;
  visualizer_blur_path: string | null;
  unlocked_at: string | null;
  sms_sent_at: string | null;
  notify_staff: boolean;
  lead_id: string | null;
  customer_id: string | null;
  utm: Record<string, string>;
  gclid: string | null;
  ip_hash: string | null;
  created_at: string;
  updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  return getSupabaseAdminClient();
}

export function newToken(): string {
  return randomBytes(16).toString("base64url");
}

export function isValidToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(token);
}

export async function getDesignByToken(token: string): Promise<HolidayDesign | null> {
  if (!isValidToken(token)) return null;
  const { data } = await db().from("holiday_light_designs").select("*").eq("token", token).maybeSingle();
  return (data as HolidayDesign | null) ?? null;
}

export async function updateDesign(id: string, patch: Partial<HolidayDesign>): Promise<HolidayDesign> {
  const { data, error } = await db().from("holiday_light_designs").update(patch).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return data as HolidayDesign;
}

// ─── Storage ──────────────────────────────────────────────────────────

let bucketReady = false;
export async function ensureBucket() {
  if (bucketReady) return;
  const supabase = db();
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!(buckets ?? []).some((b: { name: string }) => b.name === BUCKET)) {
    await supabase.storage.createBucket(BUCKET, { public: false, fileSizeLimit: 10 * 1024 * 1024 });
  }
  bucketReady = true;
}

export async function uploadObject(path: string, data: Buffer, contentType: string) {
  const { error } = await db().storage.from(BUCKET).upload(path, data, { contentType, upsert: true });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
}

export async function signedUrl(path: string, seconds = 3600): Promise<string> {
  const { data, error } = await db().storage.from(BUCKET).createSignedUrl(path, seconds);
  if (error || !data?.signedUrl) throw new Error(`Could not sign ${path}: ${error?.message ?? "unknown"}`);
  return data.signedUrl;
}

const storageIO: FinalizeIO = {
  async fetchUrl(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  },
  async readObject(path) {
    const { data, error } = await db().storage.from(BUCKET).download(path);
    if (error || !data) throw new Error(`Storage download failed: ${error?.message ?? "missing"}`);
    return Buffer.from(await data.arrayBuffer());
  },
  writeObject: uploadObject,
};

// ─── Public URLs ──────────────────────────────────────────────────────

export type ImageKind = "original" | "result" | "blur";

/** Stable app URL that 302s to a fresh signed URL (see /api/holiday-lights/image). */
export function imageUrl(design: Pick<HolidayDesign, "token" | "generation_count">, kind: ImageKind, absolute = false) {
  const path = `/api/holiday-lights/image/${design.token}/${kind}${kind === "original" ? "" : `?g=${design.generation_count}`}`;
  return absolute ? `${getSiteOrigin()}${path}` : path;
}

export function resultPageUrl(token: string) {
  return `${getSiteOrigin()}${HOLIDAY_LIGHTS.path}/visualize/${token}`;
}

/** Build & Book, prefilled with this preview's style + extras. */
export function bookPageUrl(token: string, absolute = false) {
  const base = getDesignUrl();
  const path = HOLIDAY_LIGHTS.designerUrl ? `${base}?design=${encodeURIComponent(token)}` : base;
  return absolute && path.startsWith("/") ? `${getSiteOrigin()}${path}` : path;
}

export function toPublicStatus(d: HolidayDesign) {
  const unlocked = !!d.unlocked_at;
  const ready = d.visualizer_status === "ready" && !!d.visualizer_image_path;
  const status: Exclude<VisualizerStatus, "finalizing"> =
    d.visualizer_status === "finalizing" ? "generating" : d.visualizer_status;
  return {
    status,
    unlocked,
    style: d.visualizer_style,
    imageUrl: ready ? imageUrl(d, unlocked ? "result" : "blur") : null,
    originalUrl: d.image_path ? imageUrl(d, "original") : null,
    width: d.image_width,
    height: d.image_height,
    canRestyle: d.generation_count < MAX_GENERATIONS_PER_DESIGN,
    shareUrl: resultPageUrl(d.token),
    bookUrl: bookPageUrl(d.token),
  };
}

// ─── Generation ───────────────────────────────────────────────────────

export type StartResult =
  | { ok: true; design: HolidayDesign }
  | { ok: false; status: number; error: string };

export function dailyCap(): number {
  const n = Number(process.env.HOLIDAY_VISUALIZER_DAILY_CAP);
  return Number.isFinite(n) && n > 0 ? n : 300;
}

/** Kill switch: HOLIDAY_VISUALIZER_ENABLED=0 turns off uploads + generations instantly. */
export function isVisualizerEnabled(): boolean {
  return process.env.HOLIDAY_VISUALIZER_ENABLED !== "0";
}

export const VISUALIZER_PAUSED_MESSAGE =
  "The AI preview is taking a short break. Call or text us and we'll send you a design instead.";

/** Paid generations in the last 24h, optionally for one IP (restart-proof spend guard). */
async function countRecentGenerations(ipHash?: string): Promise<number> {
  let q = db()
    .from("holiday_visualizer_generations")
    .select("id", { count: "exact", head: true })
    .gte("created_at", new Date(Date.now() - DAY_MS).toISOString());
  if (ipHash) q = q.eq("ip_hash", ipHash);
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * Start (or restart, for "try another style") a generation for this design.
 * Guardrails, cheapest first: kill switch → 3 per design → 5 per IP per day
 * (memory, then DB) → global daily cap (memory, then DB, rolling 24h).
 */
export async function startVisualization(design: HolidayDesign, options: VisualizerOptions, ipHash: string): Promise<StartResult> {
  if (!isVisualizerEnabled()) return { ok: false, status: 503, error: VISUALIZER_PAUSED_MESSAGE };
  if (!design.image_path) return { ok: false, status: 400, error: "Upload a photo first." };
  if (design.visualizer_status === "generating" || design.visualizer_status === "finalizing") {
    return { ok: true, design };
  }
  if (design.generation_count >= MAX_GENERATIONS_PER_DESIGN) {
    return { ok: false, status: 429, error: "You've tried every style we can make for this photo today." };
  }
  const ipLimited = { ok: false as const, status: 429, error: "That's the daily limit for previews. Try again tomorrow, or call us." };
  const capReached = { ok: false as const, status: 429, error: "We're making a lot of previews today. Try again tomorrow, or call us." };
  if (!rateLimit(`viz:ip:${ipHash}`, VISUALIZE_PER_IP_PER_DAY, DAY_MS).ok) return ipLimited;
  const today = new Date().toISOString().slice(0, 10);
  if (!rateLimit(`viz:global:${today}`, dailyCap(), DAY_MS).ok) return capReached;
  try {
    const [ipCount, globalCount] = await Promise.all([countRecentGenerations(ipHash), countRecentGenerations()]);
    if (ipCount >= VISUALIZE_PER_IP_PER_DAY) return ipLimited;
    if (globalCount >= dailyCap()) {
      console.warn(`[holiday-lights] daily cap reached (${globalCount}/${dailyCap()})`);
      return capReached;
    }
  } catch (err) {
    // Fail closed: if we can't count spend, don't spend.
    console.error("[holiday-lights] generation count failed:", err);
    return { ok: false, status: 503, error: "We couldn't start your preview. Try again in a minute." };
  }

  try {
    const url = await signedUrl(design.image_path, 3600);
    const prediction = await startPrediction(url, options);
    await db()
      .from("holiday_visualizer_generations")
      .insert({ design_id: design.id, style: options.style, model: getVisualizerModel(), prediction_id: prediction.id, ip_hash: ipHash })
      .then(
        () => undefined,
        (e: unknown) => console.warn("[holiday-lights] generation log failed:", e),
      );
    const updated = await updateDesign(design.id, {
      visualizer_style: options.style,
      build: options,
      replicate_prediction_id: prediction.id,
      visualizer_status: "generating",
      visualizer_error: null,
      visualizer_image_path: null,
      visualizer_blur_path: null,
      generation_count: design.generation_count + 1,
    });
    return { ok: true, design: updated };
  } catch (err) {
    console.error("[holiday-lights] startPrediction failed:", err);
    await updateDesign(design.id, { visualizer_status: "failed", visualizer_error: String(err).slice(0, 500) }).catch(() => {});
    return { ok: false, status: 502, error: "We couldn't start your preview. Try again in a minute." };
  }
}

/** Poll Replicate and finalize once. Safe to call from concurrent polls. */
export async function refreshVisualization(design: HolidayDesign): Promise<HolidayDesign> {
  const stale =
    design.visualizer_status === "finalizing" &&
    Date.now() - new Date(design.updated_at).getTime() > FINALIZE_STALE_MS;
  if (!(design.visualizer_status === "generating" || stale) || !design.replicate_prediction_id) return design;

  let prediction;
  try {
    prediction = await getPrediction(design.replicate_prediction_id);
  } catch (err) {
    console.warn("[holiday-lights] poll failed:", err);
    return design;
  }

  if (prediction.status === "failed" || prediction.status === "canceled" || (prediction.status === "succeeded" && !prediction.output)) {
    return updateDesign(design.id, { visualizer_status: "failed", visualizer_error: prediction.error ?? prediction.status });
  }
  if (prediction.status !== "succeeded" || !prediction.output) {
    if (Date.now() - new Date(design.updated_at).getTime() > GENERATION_TIMEOUT_MS) {
      return updateDesign(design.id, { visualizer_status: "failed", visualizer_error: "timeout" });
    }
    return design;
  }

  // Claim the finalize step so only one poll renders + uploads.
  const { data: claimed } = await db()
    .from("holiday_light_designs")
    .update({ visualizer_status: "finalizing" })
    .eq("id", design.id)
    .eq("replicate_prediction_id", prediction.id)
    .in("visualizer_status", stale ? ["finalizing"] : ["generating"])
    .select("*")
    .maybeSingle();
  if (!claimed) return (await getDesignByToken(design.token)) ?? design;

  try {
    await ensureBucket();
    const { imagePath, blurPath } = await finalizeResult(claimed as HolidayDesign, prediction.output, storageIO);
    return await updateDesign(design.id, {
      visualizer_status: "ready",
      visualizer_image_path: imagePath,
      visualizer_blur_path: blurPath,
    });
  } catch (err) {
    console.error("[holiday-lights] finalize failed:", err);
    return updateDesign(design.id, { visualizer_status: "failed", visualizer_error: String(err).slice(0, 500) });
  }
}

// ─── Delivery (SMS + staff email) ─────────────────────────────────────

export function resultSmsBody(d: Pick<HolidayDesign, "token" | "name">) {
  return `${HOLIDAY_LIGHTS.shortBrand}: Here's your house lit up 🎄 ${resultPageUrl(d.token)}\n\nGet your exact price: ${bookPageUrl(d.token, true)}\n\nReply STOP to opt out.`;
}

/** Once the image is ready AND unlocked: text the link (once) and email staff (new leads only). */
export async function deliverResultOnce(design: HolidayDesign): Promise<HolidayDesign> {
  if (design.visualizer_status !== "ready" || !design.unlocked_at || design.sms_sent_at || !design.phone) return design;

  const { data: claimed } = await db()
    .from("holiday_light_designs")
    .update({ sms_sent_at: new Date().toISOString() })
    .eq("id", design.id)
    .is("sms_sent_at", null)
    .select("*")
    .maybeSingle();
  if (!claimed) return design;
  const d = claimed as HolidayDesign;

  // Visualizer image shows in the lead record via photo_urls.
  if (d.lead_id) {
    await db()
      .from("service_leads")
      .update({ photo_urls: [imageUrl(d, "result", true), imageUrl(d, "original", true)] })
      .eq("id", d.lead_id)
      .then(() => undefined, () => undefined);
  }

  if (d.sms_consent) {
    const r = await sendSms(d.phone!, resultSmsBody(d)).catch((e) => ({ ok: false, error: String(e) }));
    if (!r.ok) console.warn("[holiday-lights] result SMS failed:", r.error);
  }
  if (d.notify_staff) {
    sendStaffEmail(d).catch((e) => console.warn("[holiday-lights] staff email failed:", e));
  }
  return d;
}

async function sendStaffEmail(d: HolidayDesign) {
  const phone = d.phone ?? "";
  const phoneFmt = formatPhone(phone);
  const style = d.visualizer_style ? (STYLE_LABELS[d.visualizer_style] ?? d.visualizer_style) : "—";
  const extras = summarizeExtras(d.build?.extras as Parameters<typeof summarizeExtras>[0]) || "None";
  const utm = Object.entries(d.utm ?? {})
    .map(([k, v]) => `${escapeHtml(k)}=${escapeHtml(v)}`)
    .join(", ");

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;">
      <h2 style="color:#b3122b;margin:0 0 12px;">🎄 New Holiday Lights lead (AI Visualizer)</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 12px;color:#666;">Name</td><td style="padding:6px 12px;font-weight:600;">${escapeHtml(d.name ?? "")}</td></tr>
        <tr><td style="padding:6px 12px;color:#666;">Phone</td><td style="padding:6px 12px;font-weight:600;"><a href="tel:+1${phone}">${phoneFmt}</a></td></tr>
        <tr><td style="padding:6px 12px;color:#666;">Style</td><td style="padding:6px 12px;">${escapeHtml(style)}</td></tr>
        <tr><td style="padding:6px 12px;color:#666;">Extras</td><td style="padding:6px 12px;">${escapeHtml(extras)}</td></tr>
        <tr><td style="padding:6px 12px;color:#666;">Source</td><td style="padding:6px 12px;">${utm || "direct"}${d.gclid ? " · Google Ads click" : ""}</td></tr>
      </table>
      <p><a href="${resultPageUrl(d.token)}">Open their concept preview</a></p>
      <img src="${imageUrl(d, "result", true)}" alt="Concept preview" style="max-width:100%;border-radius:8px;" />
    </div>`;

  await emailStaff(`🎄 Holiday Lights lead — ${d.name ?? "Visualizer"} (${phoneFmt})`, html);
}
