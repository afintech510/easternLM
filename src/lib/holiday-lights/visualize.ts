import sharp from "sharp";

/**
 * AI Visualizer: turn a customer's daytime house photo into a "your house lit up"
 * concept image via a Replicate image-editing model, then watermark it and make a
 * blurred teaser copy. Uses the raw-fetch Replicate pattern from image-processing.ts.
 *
 * HOLIDAY_VISUALIZER_MOCK=1 skips Replicate and fakes a night render from the
 * original photo (tests + local dev).
 */

export const STYLE_KEYS = ["warm", "multi", "candy", "elegant"] as const;
export type VisualizerStyle = (typeof STYLE_KEYS)[number];

export const STYLE_LABELS: Record<VisualizerStyle, string> = {
  warm: "Classic Warm White",
  multi: "Multicolor",
  candy: "Candy Cane",
  elegant: "Elegant White + Wreaths",
};

export function isVisualizerStyle(v: unknown): v is VisualizerStyle {
  return typeof v === "string" && (STYLE_KEYS as readonly string[]).includes(v);
}

/** Style-specific part of the prompt. */
export const STYLE_PROMPTS: Record<VisualizerStyle, string> = {
  warm:
    "Classic Warm White: warm white (2700K) LED C9 bulbs in a single straight, evenly spaced run along every roofline, eave, rake edge and gable peak.",
  multi:
    "Multicolor: classic multicolor LED C9 bulbs repeating red, orange, green, blue and yellow in a single straight, evenly spaced run along every roofline, eave, rake edge and gable peak.",
  candy:
    "Candy Cane: LED C9 bulbs alternating red and white in a single straight, evenly spaced run along every roofline, eave, rake edge and gable peak.",
  elegant:
    "Elegant White + Wreaths: warm white LED C9 bulbs in a single straight, evenly spaced run along every roofline, eave, rake edge and gable peak, plus a lit evergreen wreath with a red bow on the front door and a smaller lit wreath centered above each front-facing window.",
};

/** Rules every prompt must carry so the house itself is left untouched. */
export const PRESERVATION_RULES =
  "Keep the house architecture, roof shape, siding, windows, doors, landscaping, driveway, trees, camera angle and framing EXACTLY the same; do not add, remove, move or resize anything other than the lights described. Photorealistic photograph. No people, no text, no logos, no watermarks, no inflatables or lawn decorations.";

export function buildPrompt(style: VisualizerStyle): string {
  return [
    "Edit this photo of a house into a blue-hour night scene: deep twilight blue sky, the house exterior dim and naturally lit, warm light glowing from the windows.",
    "Add professionally installed large C9 Christmas light bulbs following the actual rooflines, eaves and gables of this exact house.",
    STYLE_PROMPTS[style],
    PRESERVATION_RULES,
  ].join(" ");
}

// ─── Replicate ────────────────────────────────────────────────────────

export const DEFAULT_VISUALIZER_MODEL = "google/nano-banana-pro";

/** nano-banana-pro: 1K and 2K both cost $0.15/image (4K is $0.30); 1K is fastest. */
export function getVisualizerResolution(): "1K" | "2K" | "4K" {
  const r = process.env.HOLIDAY_VISUALIZER_RESOLUTION?.trim().toUpperCase();
  return r === "2K" || r === "4K" ? r : "1K";
}

export function getVisualizerModel(): string {
  return process.env.HOLIDAY_VISUALIZER_MODEL?.trim() || DEFAULT_VISUALIZER_MODEL;
}

export function isMockMode(): boolean {
  return process.env.HOLIDAY_VISUALIZER_MOCK === "1";
}

/** Input schema differs per model family. */
export function buildModelInput(model: string, prompt: string, imageUrl: string): Record<string, unknown> {
  const slug = model.split(":")[0];
  if (slug.startsWith("black-forest-labs/flux-kontext")) {
    return { prompt, input_image: imageUrl, aspect_ratio: "match_input_image", output_format: "jpg", safety_tolerance: 2 };
  }
  if (slug === "google/nano-banana-pro") {
    return {
      prompt,
      image_input: [imageUrl],
      aspect_ratio: "match_input_image",
      resolution: getVisualizerResolution(),
      output_format: "jpg",
      safety_filter_level: "block_medium_and_above",
      // Never silently swap to a different model (seedream) when Google is at capacity.
      allow_fallback_model: false,
    };
  }
  if (slug.startsWith("google/nano-banana")) {
    return { prompt, image_input: [imageUrl], aspect_ratio: "match_input_image", output_format: "jpg" };
  }
  if (slug.startsWith("bytedance/seedream")) {
    return { prompt, image_input: [imageUrl], aspect_ratio: "match_input_image", max_images: 1 };
  }
  if (slug.startsWith("qwen/qwen-image-edit")) {
    return { prompt, image: [imageUrl], aspect_ratio: "match_input_image", output_format: "jpg" };
  }
  if (slug === "prunaai/p-image-edit") {
    return { prompt, images: [imageUrl], aspect_ratio: "match_input_image" };
  }
  if (slug.startsWith("black-forest-labs/flux-2")) {
    return { prompt, input_images: [imageUrl], aspect_ratio: "match_input_image", output_format: "jpg" };
  }
  return { prompt, image: imageUrl };
}

export type PredictionStatus = "starting" | "processing" | "succeeded" | "failed" | "canceled";
export type Prediction = { id: string; status: PredictionStatus; output: string | null; error: string | null };

const MOCK_PREFIX = "mock-";
const MOCK_DELAY_MS = 3000;

function replicateKey(): string {
  const key = process.env.REPLICATE_API_KEY;
  if (!key) throw new Error("REPLICATE_API_KEY not configured");
  return key;
}

export async function startPrediction(imageUrl: string, style: VisualizerStyle, model = getVisualizerModel()): Promise<Prediction> {
  if (isMockMode()) {
    return { id: `${MOCK_PREFIX}${Date.now()}`, status: "starting", output: null, error: null };
  }

  const input = buildModelInput(model, buildPrompt(style), imageUrl);
  const [slug, version] = model.split(":");
  const url = version
    ? "https://api.replicate.com/v1/predictions"
    : `https://api.replicate.com/v1/models/${slug}/predictions`;

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${replicateKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify(version ? { version, input } : { input }),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Replicate API error: ${res.status} ${err.slice(0, 300)}`);
  }
  return normalizePrediction(await res.json());
}

export async function getPrediction(id: string): Promise<Prediction> {
  if (id.startsWith(MOCK_PREFIX)) {
    const started = Number(id.slice(MOCK_PREFIX.length)) || 0;
    const done = Date.now() - started >= MOCK_DELAY_MS;
    return { id, status: done ? "succeeded" : "processing", output: done ? "mock:original" : null, error: null };
  }

  const res = await fetch(`https://api.replicate.com/v1/predictions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${replicateKey()}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Replicate poll error: ${res.status}`);
  return normalizePrediction(await res.json());
}

function normalizePrediction(p: { id: string; status: PredictionStatus; output?: unknown; error?: unknown }): Prediction {
  const out = Array.isArray(p.output) ? p.output[0] : p.output;
  return {
    id: p.id,
    status: p.status,
    output: typeof out === "string" ? out : null,
    error: p.error ? String(p.error) : null,
  };
}

// ─── Image rendering ──────────────────────────────────────────────────

export const WATERMARK_TEXT = "Concept preview · easternlm.com";

/** Full-res result with the "Concept preview" watermark, bottom-right. */
export async function renderWatermarked(input: Buffer): Promise<Buffer> {
  const img = sharp(input).rotate();
  const meta = await img.metadata();
  const w = meta.width ?? 1200;
  const h = meta.height ?? 800;
  const fs = Math.max(14, Math.round(Math.min(w, h * 1.5) * 0.024));
  const pad = Math.round(fs * 0.8);
  const boxW = Math.round(WATERMARK_TEXT.length * fs * 0.56 + pad * 2);
  const boxH = Math.round(fs * 1.9);
  const x = w - boxW - pad;
  const y = h - boxH - pad;
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" rx="${Math.round(boxH / 2)}" fill="rgba(7,20,32,0.62)"/>
    <text x="${x + boxW / 2}" y="${y + boxH / 2}" dominant-baseline="central" text-anchor="middle"
      font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="${fs}" font-weight="600" fill="#ffffff">${WATERMARK_TEXT}</text>
  </svg>`;
  return img
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 86 })
    .toBuffer();
}

/** Small, heavily blurred teaser shown before the phone gate is passed. */
export async function renderBlurred(input: Buffer): Promise<Buffer> {
  return sharp(input).rotate().resize({ width: 900, withoutEnlargement: true }).blur(40).jpeg({ quality: 60 }).toBuffer();
}

/** Mock "lit up" render: darken + blue-tint the original and string gold dots across the top. */
export async function renderMockResult(original: Buffer): Promise<Buffer> {
  const base = sharp(original).rotate();
  const meta = await base.metadata();
  const w = meta.width ?? 1200;
  const h = meta.height ?? 800;
  const y = Math.round(h * 0.3);
  const dots = Array.from({ length: 24 }, (_, i) => {
    const cx = Math.round(((i + 0.5) / 24) * w);
    return `<circle cx="${cx}" cy="${y}" r="${Math.max(4, w / 160)}" fill="#ffdf9c"/><circle cx="${cx}" cy="${y}" r="${Math.max(10, w / 60)}" fill="#ffdf9c" opacity=".3"/>`;
  }).join("");
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${dots}</svg>`;
  return base
    .modulate({ brightness: 0.45 })
    .tint({ r: 70, g: 95, b: 160 })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 85 })
    .toBuffer();
}

// ─── Finalize ─────────────────────────────────────────────────────────

export type FinalizeIO = {
  fetchUrl: (url: string) => Promise<Buffer>;
  readObject: (path: string) => Promise<Buffer>;
  writeObject: (path: string, data: Buffer, contentType: string) => Promise<void>;
};

export type FinalizeDesign = {
  id: string;
  image_path: string | null;
  generation_count: number;
  visualizer_image_path: string | null;
  visualizer_blur_path: string | null;
};

export function resultPaths(design: Pick<FinalizeDesign, "id" | "generation_count">) {
  const g = Math.max(1, design.generation_count);
  return {
    imagePath: `${design.id}/result-${g}.jpg`,
    blurPath: `${design.id}/result-${g}-blur.jpg`,
  };
}

/**
 * Download the model output, store a watermarked full image and a blurred copy.
 * Idempotent: if the design already has a result image, nothing is re-rendered.
 */
export async function finalizeResult(
  design: FinalizeDesign,
  outputUrl: string,
  io: FinalizeIO,
): Promise<{ imagePath: string; blurPath: string; created: boolean }> {
  if (design.visualizer_image_path && design.visualizer_blur_path) {
    return { imagePath: design.visualizer_image_path, blurPath: design.visualizer_blur_path, created: false };
  }

  let raw: Buffer;
  if (outputUrl.startsWith("mock:")) {
    if (!design.image_path) throw new Error("Design has no original image");
    raw = await renderMockResult(await io.readObject(design.image_path));
  } else {
    raw = await io.fetchUrl(outputUrl);
  }

  const [full, blur] = await Promise.all([renderWatermarked(raw), renderBlurred(raw)]);
  const { imagePath, blurPath } = resultPaths(design);
  await io.writeObject(imagePath, full, "image/jpeg");
  await io.writeObject(blurPath, blur, "image/jpeg");
  return { imagePath, blurPath, created: true };
}
