import sharp from "sharp";
import {
  DEFAULT_VISUALIZER_MODEL,
  PRESERVATION_RULES,
  STYLE_KEYS,
  buildModelInput,
  buildPrompt,
  finalizeResult,
  getPrediction,
  isVisualizerStyle,
  resultPaths,
  type FinalizeIO,
} from "./visualize";

async function fixtureJpeg(width = 320, height = 200) {
  return sharp({ create: { width, height, channels: 3, background: { r: 180, g: 200, b: 220 } } }).jpeg().toBuffer();
}

function memoryIO(original: Buffer) {
  const store = new Map<string, Buffer>();
  const calls = { fetchUrl: 0, readObject: 0, writeObject: 0 };
  const io: FinalizeIO = {
    fetchUrl: async () => {
      calls.fetchUrl++;
      return original;
    },
    readObject: async () => {
      calls.readObject++;
      return original;
    },
    writeObject: async (path, data) => {
      calls.writeObject++;
      store.set(path, data);
    },
  };
  return { io, store, calls };
}

describe("buildPrompt", () => {
  it.each(STYLE_KEYS)("%s includes the preservation rules and the night/C9 brief", (style) => {
    const p = buildPrompt(style);
    expect(p).toContain(PRESERVATION_RULES);
    expect(p).toMatch(/blue-hour night/);
    expect(p).toMatch(/C9/);
    expect(p).toMatch(/rooflines/);
    expect(p).toMatch(/EXACTLY the same/);
    expect(p).toMatch(/camera angle and framing/);
    expect(p).toMatch(/No people, no text/);
  });

  it("varies by style", () => {
    expect(buildPrompt("candy")).toMatch(/alternating red and white/);
    expect(buildPrompt("multi")).toMatch(/multicolor/);
    expect(buildPrompt("elegant")).toMatch(/wreath/);
    expect(buildPrompt("warm")).not.toMatch(/wreath/);
  });
});

describe("isVisualizerStyle", () => {
  it("accepts only the four UI styles", () => {
    expect(isVisualizerStyle("warm")).toBe(true);
    expect(isVisualizerStyle("glow")).toBe(false);
    expect(isVisualizerStyle(undefined)).toBe(false);
  });
});

describe("buildModelInput", () => {
  it("maps FLUX Kontext inputs", () => {
    const i = buildModelInput("black-forest-labs/flux-kontext-pro", "p", "https://x/img.webp");
    expect(i).toMatchObject({ prompt: "p", input_image: "https://x/img.webp", aspect_ratio: "match_input_image" });
  });
  it("maps nano-banana inputs", () => {
    const i = buildModelInput("google/nano-banana", "p", "https://x/img.webp");
    expect(i).toMatchObject({ prompt: "p", image_input: ["https://x/img.webp"], aspect_ratio: "match_input_image" });
    expect(i).not.toHaveProperty("resolution");
  });
  it("maps nano-banana-pro inputs with guardrails", () => {
    const i = buildModelInput("google/nano-banana-pro", "p", "https://x/img.webp");
    expect(i).toMatchObject({
      prompt: "p",
      image_input: ["https://x/img.webp"],
      aspect_ratio: "match_input_image",
      resolution: "1K",
      safety_filter_level: "block_medium_and_above",
      allow_fallback_model: false,
    });
  });
  it("maps Seedream inputs", () => {
    const i = buildModelInput("bytedance/seedream-4.5", "p", "https://x/img.webp");
    expect(i).toMatchObject({ prompt: "p", image_input: ["https://x/img.webp"], aspect_ratio: "match_input_image", max_images: 1 });
  });
  it("maps Qwen Image Edit inputs", () => {
    const i = buildModelInput("qwen/qwen-image-edit-2511", "p", "https://x/img.webp");
    expect(i).toMatchObject({ prompt: "p", image: ["https://x/img.webp"], aspect_ratio: "match_input_image", output_format: "jpg" });
  });
  it("maps p-image-edit inputs", () => {
    const i = buildModelInput("prunaai/p-image-edit", "p", "https://x/img.webp");
    expect(i).toMatchObject({ prompt: "p", images: ["https://x/img.webp"], aspect_ratio: "match_input_image" });
  });
  it("maps FLUX.2 inputs", () => {
    const i = buildModelInput("black-forest-labs/flux-2-dev", "p", "https://x/img.webp");
    expect(i).toMatchObject({ prompt: "p", input_images: ["https://x/img.webp"], aspect_ratio: "match_input_image", output_format: "jpg" });
  });
  it("defaults to nano-banana-pro", () => {
    expect(DEFAULT_VISUALIZER_MODEL).toBe("google/nano-banana-pro");
  });
});

describe("mock predictions", () => {
  it("succeed after the mock delay", async () => {
    const fresh = await getPrediction(`mock-${Date.now()}`);
    expect(fresh.status).toBe("processing");
    const old = await getPrediction(`mock-${Date.now() - 10_000}`);
    expect(old).toMatchObject({ status: "succeeded", output: "mock:original" });
  });
});

describe("finalizeResult", () => {
  const design = { id: "d1", image_path: "d1/original.webp", generation_count: 1, visualizer_image_path: null, visualizer_blur_path: null };

  it("writes a watermarked image and a blurred copy", async () => {
    const original = await fixtureJpeg();
    const { io, store } = memoryIO(original);
    const r = await finalizeResult(design, "https://replicate.delivery/out.jpg", io);
    expect(r.created).toBe(true);
    expect(r).toMatchObject(resultPaths(design));
    expect(store.has(r.imagePath)).toBe(true);
    expect(store.has(r.blurPath)).toBe(true);
    const full = await sharp(store.get(r.imagePath)!).metadata();
    expect(full.format).toBe("jpeg");
    expect(full.width).toBe(320);
  });

  it("is idempotent once a result exists", async () => {
    const { io, calls } = memoryIO(await fixtureJpeg());
    const done = { ...design, visualizer_image_path: "d1/result-1.jpg", visualizer_blur_path: "d1/result-1-blur.jpg" };
    const r = await finalizeResult(done, "https://replicate.delivery/out.jpg", io);
    expect(r).toEqual({ imagePath: "d1/result-1.jpg", blurPath: "d1/result-1-blur.jpg", created: false });
    expect(calls).toEqual({ fetchUrl: 0, readObject: 0, writeObject: 0 });
  });

  it("renders from the original photo in mock mode", async () => {
    const { io, calls } = memoryIO(await fixtureJpeg());
    const r = await finalizeResult({ ...design, generation_count: 2 }, "mock:original", io);
    expect(calls.readObject).toBe(1);
    expect(calls.fetchUrl).toBe(0);
    expect(r.imagePath).toBe("d1/result-2.jpg");
  });
});
