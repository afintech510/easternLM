import sharp from "sharp";

const MAX_DIMENSION = 1600;
const QUALITY = 80;

export async function optimizeImage(buffer: Buffer, originalName: string): Promise<{
  optimized: Buffer;
  filename: string;
  contentType: string;
  originalSize: number;
  optimizedSize: number;
}> {
  const originalSize = buffer.length;
  const baseName = originalName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9.-]/g, "_");

  const optimized = await sharp(buffer)
    .rotate() // auto-rotate based on EXIF (iPhone orientation fix)
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();

  return {
    optimized,
    filename: `${Date.now()}-${baseName}.webp`,
    contentType: "image/webp",
    originalSize,
    optimizedSize: optimized.length,
  };
}

export async function extractVideoThumbnail(buffer: Buffer, originalName: string): Promise<{
  thumbnail: Buffer;
  filename: string;
  contentType: string;
}> {
  // Sharp can extract first frame from some video formats via libvips
  // For broader support, we store the video and generate a placeholder
  const baseName = originalName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9.-]/g, "_");

  // Generate a simple branded placeholder for now — real thumbnail from first frame
  // would require ffmpeg which isn't available in serverless
  const placeholder = await sharp({
    create: { width: 800, height: 800, channels: 4, background: { r: 30, g: 58, b: 69, alpha: 1 } },
  })
    .composite([{
      input: Buffer.from(
        `<svg width="800" height="800">
          <rect x="350" y="340" width="100" height="120" rx="10" fill="none" stroke="white" stroke-width="4"/>
          <polygon points="385,370 385,430 425,400" fill="white"/>
          <text x="400" y="520" text-anchor="middle" font-family="sans-serif" font-size="24" fill="white" opacity="0.7">Video</text>
        </svg>`
      ),
      top: 0,
      left: 0,
    }])
    .webp({ quality: 80 })
    .toBuffer();

  return {
    thumbnail: placeholder,
    filename: `${Date.now()}-${baseName}-thumb.webp`,
    contentType: "image/webp",
  };
}

const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY;

export async function enhanceWithAI(imageUrl: string): Promise<{ enhancedUrl: string; predictionId: string }> {
  if (!REPLICATE_API_KEY) throw new Error("REPLICATE_API_KEY not configured");

  const res = await fetch("https://api.replicate.com/v1/models/philz1337x/clarity-upscaler/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REPLICATE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: {
        image: imageUrl,
        prompt: "professional product photography of landscape supply material, natural lighting, clean background, high detail texture, commercial catalog quality",
        negative_prompt: "blurry, dark, overexposed, watermark, text overlay, low quality, artificial, oversaturated",
        scale_factor: 2,
        resemblance: 0.8,
        creativity: 0.3,
        output_format: "webp",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Replicate API error: ${res.status} ${JSON.stringify(err)}`);
  }

  const prediction = await res.json();
  const predictionId = prediction.id;

  // Poll for completion
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));

    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${REPLICATE_API_KEY}` },
    });
    const status = await pollRes.json();

    if (status.status === "succeeded") {
      const output = Array.isArray(status.output) ? status.output[0] : status.output;
      return { enhancedUrl: output, predictionId };
    }
    if (status.status === "failed" || status.status === "canceled") {
      throw new Error(`Replicate prediction ${status.status}: ${status.error || "unknown"}`);
    }
  }

  throw new Error("Replicate prediction timed out after 2 minutes");
}
