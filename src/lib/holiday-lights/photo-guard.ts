import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { z } from "zod";

/**
 * Guardrail: before we pay for an image generation, check (cheaply, with Claude
 * Haiku vision) that the upload is actually the outside of a house and nothing
 * inappropriate. Stops the visualizer being used as a free general image editor.
 *
 * Fails OPEN (allows the photo) when the key is missing or the API errors, so a
 * Claude outage never blocks real customers — the rate limits and daily cap
 * still bound spend. Disable entirely with HOLIDAY_PHOTO_GUARD=0.
 */

export const DEFAULT_GUARD_MODEL = "claude-haiku-4-5-20251001";

const verdictSchema = z.object({
  house_exterior: z.boolean(),
  people_prominent: z.boolean(),
  inappropriate: z.boolean(),
  reason: z.string().max(300).optional().default(""),
});
export type PhotoVerdict = z.infer<typeof verdictSchema>;

export type PhotoCheck =
  | { ok: true; checked: boolean; verdict?: PhotoVerdict }
  | { ok: false; checked: true; verdict: PhotoVerdict; message: string };

const PROMPT = `You screen photos uploaded to a Christmas-lights visualizer. The customer should upload a photo of the OUTSIDE of their own house or building (front view, any time of day; partial views, snow, cars or trees in frame are fine).

Answer with ONLY this JSON, no markdown:
{"house_exterior": boolean, "people_prominent": boolean, "inappropriate": boolean, "reason": "short reason"}

- house_exterior: true if the main subject is the exterior of a house, home, townhouse, cottage or similar residential/small building where roofline lights could be hung. False for interiors, selfies, pets, documents, screenshots of non-house content, landscapes with no building, memes, etc.
- people_prominent: true only if one or more people are a main subject (close up or clearly identifiable). Small distant figures are false.
- inappropriate: true for nudity, sexual content, violence, hate symbols or anything offensive.`;

/** Parse the model's reply (tolerates prose around the JSON). Null if unusable. */
export function parseVerdict(text: string): PhotoVerdict | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const parsed = verdictSchema.safeParse(JSON.parse(m[0]));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function verdictToCheck(verdict: PhotoVerdict): PhotoCheck {
  if (verdict.inappropriate) {
    return { ok: false, checked: true, verdict, message: "We can't use that photo. Upload a photo of the front of your house." };
  }
  if (!verdict.house_exterior) {
    return {
      ok: false,
      checked: true,
      verdict,
      message: "That doesn't look like the front of a house. Try a photo taken from the street, straight on.",
    };
  }
  if (verdict.people_prominent) {
    return { ok: false, checked: true, verdict, message: "Use a photo of the house without people in it." };
  }
  return { ok: true, checked: true, verdict };
}

export function isPhotoGuardEnabled(): boolean {
  return process.env.HOLIDAY_PHOTO_GUARD !== "0" && process.env.HOLIDAY_VISUALIZER_MOCK !== "1" && !!process.env.ANTHROPIC_API_KEY;
}

export async function checkHousePhoto(image: Buffer): Promise<PhotoCheck> {
  if (!isPhotoGuardEnabled()) return { ok: true, checked: false };

  try {
    const small = await sharp(image).rotate().resize(768, 768, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer();
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 15_000, maxRetries: 1 });
    const response = await anthropic.messages.create({
      model: process.env.HOLIDAY_PHOTO_GUARD_MODEL?.trim() || DEFAULT_GUARD_MODEL,
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: small.toString("base64") } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
    const verdict = parseVerdict(text);
    if (!verdict) {
      console.warn("[holiday-lights] photo guard: unparseable reply, allowing:", text.slice(0, 200));
      return { ok: true, checked: false };
    }
    return verdictToCheck(verdict);
  } catch (err) {
    console.warn("[holiday-lights] photo guard failed open:", err instanceof Error ? err.message : String(err));
    return { ok: true, checked: false };
  }
}
