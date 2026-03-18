"use client";

import { useEffect, useState } from "react";
import { Loader2, Send, Sparkles, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface QuickQuoteResult {
  quoteNumber: string;
  quoteUrl: string;
  sent: string[];
}

export function QuickQuoteButton() {
  const [open, setOpen] = useState(false);

  // Global keyboard shortcut: Ctrl+Q / Cmd+Q
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "q") {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-accent/10 border border-accent/20 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/20 transition-colors"
      >
        <Zap className="size-4" />
        Quick Quote
        <kbd className="hidden sm:inline ml-1 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-mono text-accent/60">Ctrl+Q</kbd>
      </button>

      {open && <QuickQuoteModal onClose={() => setOpen(false)} />}
    </>
  );
}

export function QuickQuoteSidebarButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "q") {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2.5 rounded-lg bg-accent/10 px-3 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
      >
        <Zap className="size-4" />
        Quick Quote
      </button>
      {open && <QuickQuoteModal onClose={() => setOpen(false)} />}
    </>
  );
}

function QuickQuoteModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"simple" | "ai">("simple");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  // Simple mode: manual line items
  const [lineItems, setLineItems] = useState([
    { description: "", qty: "1", unit: "yard", price: "" },
  ]);
  const [deposit, setDeposit] = useState("200");
  const [note, setNote] = useState("");

  // AI mode
  const [aiPrompt, setAiPrompt] = useState("");

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<QuickQuoteResult | null>(null);

  function addLine() {
    setLineItems((prev) => [...prev, { description: "", qty: "1", unit: "yard", price: "" }]);
  }

  function removeLine(idx: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, field: string, value: string) {
    setLineItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  async function handleSendSimple(via?: string[]) {
    if (!lineItems.some((l) => l.description && l.price)) {
      toast.error("Add at least one line item with description and price");
      return;
    }
    setSending(true);
    try {
      const items = lineItems
        .filter((l) => l.description && l.price)
        .map((l) => ({
          name: l.description,
          quantity: parseFloat(l.qty) || 1,
          unit: l.unit,
          unitPriceCents: Math.round(parseFloat(l.price) * 100),
        }));

      const res = await fetch("/api/quotes/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          customer: { name: customerName || "Customer", phone: customerPhone || undefined, email: customerEmail || undefined, address: customerAddress || undefined },
          depositCents: Math.round(parseFloat(deposit || "0") * 100),
          note,
          validDays: 30,
          sendVia: via,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setResult({ quoteNumber: d.quote.quoteNumber, quoteUrl: d.quote.quoteUrl, sent: d.sent ?? [] });
        toast.success(`Quote ${d.quote.quoteNumber} created!`);
      } else {
        toast.error(d.error ?? "Failed");
      }
    } catch { toast.error("Failed to create quote"); }
    setSending(false);
  }

  async function handleAiGenerate() {
    if (!aiPrompt.trim()) return;
    setSending(true);
    try {
      // Generate via AI
      const genRes = await fetch("/api/admin/quotes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, customerName, customerPhone, customerEmail }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) { toast.error(genData.error ?? "AI generation failed"); setSending(false); return; }

      // Create the quote
      const createRes = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...genData.quote,
          customer_name: customerName || genData.quote.customer?.name || "Customer",
          customer_phone: customerPhone || genData.quote.customer?.phone || null,
          customer_email: customerEmail || genData.quote.customer?.email || null,
          customer_address: customerAddress || genData.quote.customer?.address || null,
          ai_prompt: aiPrompt,
          ai_generated: true,
        }),
      });
      const createData = await createRes.json();
      if (createRes.ok) {
        const q = createData.quote;
        toast.success(`AI Quote ${q.quote_number} created!`);
        window.open(`/admin/quotes/${q.id}`, "_blank");
        onClose();
      } else {
        toast.error(createData.error ?? "Failed to save quote");
      }
    } catch { toast.error("Failed"); }
    setSending(false);
  }

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
        <div className="w-[400px] rounded-2xl border bg-card p-6 space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-green-600 text-xl">✓</span>
            </div>
            <h2 className="text-lg font-bold">Quote Created!</h2>
            <p className="text-sm text-muted-foreground">{result.quoteNumber}</p>
            {result.sent.length > 0 && <p className="text-xs text-green-600">Sent via {result.sent.join(" & ")}</p>}
            <code className="block text-xs text-muted-foreground break-all bg-muted rounded px-2 py-1">{result.quoteUrl}</code>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { navigator.clipboard.writeText(result.quoteUrl); toast.success("Link copied"); }}>Copy Link</Button>
            <Button className="flex-1" onClick={onClose}>Done</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-[520px] max-h-[90vh] overflow-y-auto rounded-2xl border bg-card p-6 space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Zap className="size-5 text-accent" /> Quick Quote
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-5" /></button>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-lg border overflow-hidden">
          <button onClick={() => setMode("simple")} className={`flex-1 py-2 text-sm font-medium ${mode === "simple" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
            Quick Items
          </button>
          <button onClick={() => setMode("ai")} className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-1.5 ${mode === "ai" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
            <Sparkles className="size-3.5" /> AI Generate
          </button>
        </div>

        {/* Customer */}
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <Input placeholder="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          <Input placeholder="Email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
          <Input placeholder="Address" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
        </div>

        {mode === "simple" ? (
          <>
            {/* Line items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Line Items</p>
                <Button variant="ghost" size="sm" onClick={addLine}>+ Add</Button>
              </div>
              {lineItems.map((item, idx) => (
                <div key={idx} className="flex gap-1.5 items-center">
                  <Input className="flex-1" placeholder="Description" value={item.description} onChange={(e) => updateLine(idx, "description", e.target.value)} />
                  <Input className="w-16" placeholder="Qty" value={item.qty} onChange={(e) => updateLine(idx, "qty", e.target.value)} />
                  <Input className="w-16" placeholder="Unit" value={item.unit} onChange={(e) => updateLine(idx, "unit", e.target.value)} />
                  <Input className="w-20" placeholder="Price" value={item.price} onChange={(e) => updateLine(idx, "price", e.target.value)} />
                  {lineItems.length > 1 && (
                    <button onClick={() => removeLine(idx)} className="text-muted-foreground hover:text-destructive"><X className="size-3.5" /></button>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Deposit ($)</label>
                <Input value={deposit} onChange={(e) => setDeposit(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Note</label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Job description" />
              </div>
            </div>

            {/* Send buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" onClick={() => handleSendSimple(["sms"])} disabled={sending || !customerPhone}>
                <Send className="size-3.5 mr-1" /> Text
              </Button>
              <Button variant="outline" onClick={() => handleSendSimple(["email"])} disabled={sending || !customerEmail}>
                <Send className="size-3.5 mr-1" /> Email
              </Button>
              <Button onClick={() => handleSendSimple(["sms", "email"])} disabled={sending || (!customerPhone && !customerEmail)}>
                {sending ? <Loader2 className="size-4 animate-spin mr-1" /> : <Send className="size-4 mr-1" />}
                Both
              </Button>
            </div>
            <Button variant="ghost" className="w-full" onClick={() => handleSendSimple()} disabled={sending}>
              Save as Draft
            </Button>
          </>
        ) : (
          <>
            {/* AI prompt */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Describe the job</label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. Gravel driveway 40x12ft, 4&quot; RCA base, 3&quot; bluestone, belgian block edging both sides"
                className="w-full min-h-[100px] rounded-lg border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-y"
              />
            </div>
            <Button className="w-full" onClick={handleAiGenerate} disabled={sending || !aiPrompt.trim()}>
              {sending ? <><Loader2 className="size-4 animate-spin mr-2" /> Generating...</> : <><Sparkles className="size-4 mr-2" /> Generate Quote</>}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
