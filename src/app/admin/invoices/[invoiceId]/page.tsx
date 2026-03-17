"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Scan,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/format";

interface LineItem {
  description: string;
  quantity: number;
  unit: string;
  unit_cost_cents: number | null;
  total_cents: number | null;
  notes?: string | null;
  supplier_product_id?: string | null;
  matched_name?: string | null;
  current_cost_cents?: number | null;
  price_changed?: boolean;
}

interface Invoice {
  id: string;
  supplier_id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  total_amount_cents: number | null;
  ocr_status: string;
  is_paid: boolean;
  paid_at: string | null;
  notes: string | null;
  line_items: LineItem[];
  file_urls: string[];
  signed_urls: string[];
  suppliers: { id: string; name: string; slug: string };
}

function centsToInput(c: number | null | undefined): string {
  if (c == null) return "";
  return (c / 100).toFixed(2);
}

function inputToCents(s: string): number | null {
  const v = parseFloat(s);
  return isNaN(v) ? null : Math.round(v * 100);
}

export default function InvoiceReviewPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.invoiceId as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentFile, setCurrentFile] = useState(0);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [totalInput, setTotalInput] = useState("");
  const [notes, setNotes] = useState("");

  async function loadInvoice() {
    setLoading(true);
    const r = await fetch(`/api/admin/invoices/${invoiceId}`);
    const d = await r.json();
    if (r.ok && d.invoice) {
      const inv: Invoice = d.invoice;
      setInvoice(inv);
      setLineItems(inv.line_items ?? []);
      setInvoiceNumber(inv.invoice_number ?? "");
      setInvoiceDate(inv.invoice_date ?? "");
      setTotalInput(centsToInput(inv.total_amount_cents));
      setNotes(inv.notes ?? "");
    }
    setLoading(false);
  }

  useEffect(() => { loadInvoice(); }, [invoiceId]);

  async function handleExtract() {
    setExtracting(true);
    try {
      const r = await fetch("/api/admin/invoices/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await loadInvoice();
    } catch (e) {
      alert("Extraction failed: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setExtracting(false);
    }
  }

  async function handleSave(confirm = false) {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        invoice_number: invoiceNumber || null,
        invoice_date: invoiceDate || null,
        total_amount_cents: inputToCents(totalInput),
        line_items: lineItems,
        notes: notes || null,
      };
      if (confirm) body.ocr_status = "confirmed";

      const r = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (confirm) {
        router.push(`/admin/suppliers/${invoice?.supplier_id}`);
      } else {
        await loadInvoice();
      }
    } catch (e) {
      alert("Save failed: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  async function togglePaid() {
    if (!invoice) return;
    setSaving(true);
    await fetch(`/api/admin/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_paid: !invoice.is_paid }),
    });
    await loadInvoice();
    setSaving(false);
  }

  function updateItem(idx: number, field: keyof LineItem, value: unknown) {
    setLineItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  function removeItem(idx: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function addItem() {
    setLineItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unit: "each", unit_cost_cents: null, total_cents: null },
    ]);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return <div className="p-6 text-destructive">Invoice not found.</div>;
  }

  const hasSignedUrls = invoice.signed_urls?.length > 0;
  const priceChanges = lineItems.filter((i) => i.price_changed);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Top bar */}
      <div className="flex shrink-0 items-center gap-3 border-b bg-card px-6 py-3">
        <Link
          href={`/admin/suppliers/${invoice.supplier_id}/invoices`}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <span className="font-semibold">
            Invoice {invoice.invoice_number ? `#${invoice.invoice_number}` : "(no number)"}
          </span>
          <span className="text-sm text-muted-foreground">{invoice.suppliers?.name}</span>
          {invoice.is_paid && (
            <Badge variant="outline" className="text-green-600 border-green-200">Paid</Badge>
          )}
          {invoice.ocr_status === "confirmed" && (
            <Badge variant="default"><CheckCircle className="mr-1 size-3" />Confirmed</Badge>
          )}
          {invoice.ocr_status === "extracted" && (
            <Badge variant="outline" className="text-amber-600 border-amber-200">Needs Review</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={togglePaid} disabled={saving}>
            {invoice.is_paid ? "Mark Unpaid" : "Mark Paid"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : "Save Draft"}
          </Button>
          {invoice.ocr_status !== "confirmed" && (
            <Button size="sm" onClick={() => handleSave(true)} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : (
                <><Check className="mr-1 size-4" />Confirm & Save</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Split view */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left: file viewer */}
        <div className="flex w-1/2 shrink-0 flex-col border-r bg-muted/20">
          {hasSignedUrls ? (
            <>
              <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
                <span className="text-sm text-muted-foreground">
                  File {currentFile + 1} of {invoice.signed_urls.length}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={currentFile === 0}
                    onClick={() => setCurrentFile((p) => p - 1)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    disabled={currentFile >= invoice.signed_urls.length - 1}
                    onClick={() => setCurrentFile((p) => p + 1)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-2">
                {invoice.file_urls?.[currentFile]?.endsWith(".pdf") ? (
                  <iframe
                    src={invoice.signed_urls[currentFile]}
                    className="h-full w-full rounded border"
                    title="Invoice PDF"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={invoice.signed_urls[currentFile]}
                    alt="Invoice"
                    className="mx-auto max-w-full rounded border object-contain"
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              No files attached
            </div>
          )}
        </div>

        {/* Right: extracted data editor */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 space-y-6">
          {/* Extract button */}
          {["pending", "failed", "extracted"].includes(invoice.ocr_status) && (
            <div className="flex items-center justify-between rounded-lg border bg-card p-4">
              <div>
                <p className="font-medium">
                  {invoice.ocr_status === "extracted" ? "Re-run AI Extraction" : "Extract with AI"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Claude will read the invoice and fill in the fields below
                </p>
              </div>
              <Button onClick={handleExtract} disabled={extracting} variant="outline">
                {extracting ? (
                  <><Loader2 className="mr-2 size-4 animate-spin" />Extracting…</>
                ) : (
                  <><Scan className="mr-2 size-4" />Extract</>
                )}
              </Button>
            </div>
          )}

          {invoice.ocr_status === "processing" && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
              <Loader2 className="size-5 animate-spin text-accent" />
              <p className="text-sm">Extracting data with AI… This may take up to 30 seconds.</p>
            </div>
          )}

          {/* Price change warning */}
          {priceChanges.length > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">
                  {priceChanges.length} price change{priceChanges.length !== 1 ? "s" : ""} detected
                </p>
                <p className="text-sm text-amber-700">
                  Confirming will update supplier product costs and log to price history.
                </p>
              </div>
            </div>
          )}

          {/* Invoice header fields */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Invoice Details</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Invoice #</label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-1234"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Invoice Date</label>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Total Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                  <Input
                    className="pl-7"
                    value={totalInput}
                    onChange={(e) => setTotalInput(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Notes</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes…"
              />
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Line Items ({lineItems.length})
              </h3>
              <Button variant="outline" size="sm" onClick={addItem}>+ Add Item</Button>
            </div>

            {lineItems.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No items yet. Run AI extraction or add manually.
              </p>
            )}

            {lineItems.map((item, idx) => (
              <div
                key={idx}
                className={`rounded-lg border p-3 space-y-2 ${
                  item.price_changed ? "border-amber-200 bg-amber-50/30" : "bg-card"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-muted-foreground">Description</label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(idx, "description", e.target.value)}
                      placeholder="Product description"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mt-5 size-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(idx)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Qty</label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Unit</label>
                    <Input
                      value={item.unit}
                      onChange={(e) => updateItem(idx, "unit", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Unit Cost</label>
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-2.5 size-3 text-muted-foreground" />
                      <Input
                        className="pl-5"
                        value={centsToInput(item.unit_cost_cents)}
                        onChange={(e) => updateItem(idx, "unit_cost_cents", inputToCents(e.target.value))}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Line Total</label>
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-2.5 size-3 text-muted-foreground" />
                      <Input
                        className="pl-5"
                        value={centsToInput(item.total_cents)}
                        onChange={(e) => updateItem(idx, "total_cents", inputToCents(e.target.value))}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Match info */}
                {item.matched_name && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Matched:</span>
                    <span className="font-medium">{item.matched_name}</span>
                    {item.price_changed ? (
                      <span className="text-amber-700">
                        Current cost: {formatUsd(item.current_cost_cents ?? 0)} →{" "}
                        <strong>{formatUsd(item.unit_cost_cents ?? 0)}</strong>
                      </span>
                    ) : (
                      <span className="text-green-600">Price unchanged</span>
                    )}
                  </div>
                )}

                {item.notes && (
                  <p className="text-xs text-muted-foreground">{item.notes}</p>
                )}
              </div>
            ))}

            {/* Summary */}
            {lineItems.length > 0 && (
              <div className="flex justify-end pt-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Calculated total: </span>
                  <span className="font-semibold">
                    {formatUsd(
                      lineItems.reduce((sum, i) => sum + (i.total_cents ?? (i.unit_cost_cents ?? 0) * i.quantity), 0)
                    )}
                  </span>
                  {totalInput && (
                    <span className="ml-2 text-muted-foreground">
                      (entered: {formatUsd(inputToCents(totalInput) ?? 0)})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
