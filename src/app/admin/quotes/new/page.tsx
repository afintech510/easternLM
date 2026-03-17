"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NewQuotePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError("");
    try {
      // Generate quote via Claude
      const genRes = await fetch("/api/admin/quotes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error);

      const q = genData.quote;

      // Save as draft
      const saveRes = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: q.customer?.name ?? "",
          customer_phone: q.customer?.phone ?? null,
          customer_email: q.customer?.email ?? null,
          customer_address: q.customer?.address ?? null,
          title: q.title,
          description: q.description ?? null,
          line_items: q.line_items ?? [],
          subtotal_cents: q.subtotal_cents,
          tax_cents: q.tax_cents,
          total_cents: q.total_cents,
          deposit_required_cents: q.deposit_required_cents,
          valid_until: q.valid_until ?? null,
          estimated_timeline: q.estimated_timeline ?? null,
          terms: q.terms ?? null,
          ai_prompt: prompt,
          ai_generated: true,
          status: "draft",
        }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error);

      router.push(`/admin/quotes/${saveData.quote.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setGenerating(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/quotes" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-semibold">New Quote</h1>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div>
          <h2 className="font-medium">Describe the job</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Include customer name, phone, address, materials, dimensions, and any special requirements. The AI will generate a full professional quote.
          </p>
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full min-h-[220px] rounded-lg border bg-background p-4 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-y font-mono"
          placeholder={`Customer: Mike Johnson, 631-555-1234
Address: 45 Oak Street, Shirley, NY

Gravel driveway — about 40 feet long, 12 feet wide.
Remove existing top, regrade, 4 inches RCA base compacted,
3 inches 3/4 bluestone surface.
Include belgian block edging on both sides.
Estimate 2-3 days work.`}
          disabled={generating}
        />

        {error && (
          <p className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            size="lg"
          >
            {generating ? (
              <><Loader2 className="mr-2 size-4 animate-spin" />Generating…</>
            ) : (
              <><Sparkles className="mr-2 size-4" />Generate Quote</>
            )}
          </Button>
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        AI-generated quote will open for review. You can adjust all fields before sending.
      </div>
    </div>
  );
}
