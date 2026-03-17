import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { prompt } = await request.json();
  if (!prompt?.trim()) return NextResponse.json({ error: "prompt required" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });

  const anthropic = new Anthropic({ apiKey });

  const today = new Date();
  const validUntil = new Date(today);
  validUntil.setDate(validUntil.getDate() + 30);

  const systemPrompt = `You are a quoting assistant for Eastern Landscape & Mason Supply, a landscape and masonry supply yard in Center Moriches, NY. You generate professional, accurate quotes for landscaping and masonry jobs.

Current pricing context (use these as baselines, adjust for job complexity):
- Topsoil: ~$55-65/yard delivered
- Mulch: $45-55/yard delivered
- RCA/Base gravel: $50-60/yard delivered
- 3/4" Bluestone/stone: $120-145/yard delivered
- Belgian block edging: $18-22/linear foot installed
- Concrete work: $12-18/sq ft
- Paver installation: $18-28/sq ft
- Labor (general landscaping): $75-110/hr crew
- Delivery: $60-85/load depending on distance
- Tax rate: 8.75% (Suffolk County NY)
- Deposit: typically 25-50% of total (round to nearest $500)

Rules:
- Convert all money to CENTS (integer, multiply dollars × 100)
- Calculate quantities from dimensions provided
- Include realistic labor estimates
- Add delivery if materials need to be brought in
- valid_until should be 30 days from today: ${validUntil.toISOString().slice(0, 10)}
- Return ONLY valid JSON, no markdown fences, no commentary`;

  const userMsg = `Generate a professional quote from this job description:

${prompt}

Return a JSON object with this exact structure:
{
  "customer": {
    "name": "string",
    "phone": "string or null",
    "email": "string or null",
    "address": "string or null"
  },
  "title": "short professional title",
  "description": "2-3 sentence professional description of the work",
  "line_items": [
    {
      "description": "item description",
      "quantity": number,
      "unit": "yard|ton|sq ft|lin ft|load|job|hr|each",
      "unit_price_cents": integer,
      "total_cents": integer
    }
  ],
  "subtotal_cents": integer,
  "tax_cents": integer (subtotal × 0.0875, rounded),
  "total_cents": integer (subtotal + tax),
  "deposit_required_cents": integer (25-50% rounded to nearest $500, minimum $250),
  "estimated_timeline": "string",
  "valid_until": "YYYY-MM-DD",
  "terms": "50% deposit required to schedule. Balance due upon completion. Materials subject to availability. Price valid for 30 days."
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userMsg }],
    });

    const rawText = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    // Extract JSON — handle markdown code fences if model includes them
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const quote = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ quote });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
