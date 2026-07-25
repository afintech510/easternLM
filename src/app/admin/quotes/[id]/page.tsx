"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Send, Printer, ExternalLink, Plus, X, DollarSign,
  CheckCircle, Eye, Clock, XCircle, AlertCircle, Sparkles, Copy, Upload,
  ImageIcon, ArrowRight, Trash2, Truck, Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/format";
import { ChargeQuoteModal } from "@/components/admin/charge-quote-modal";

interface LineItem {
  description: string;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  total_cents: number;
}

interface Quote {
  id: string;
  quote_number: string;
  public_token: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string | null;
  title: string;
  description: string | null;
  line_items: LineItem[];
  subtotal_cents: number;
  tax_cents: number;
  tax_exempt: boolean;
  tax_exempt_certificate: string | null;
  total_cents: number;
  deposit_required_cents: number;
  deposit_paid_cents: number;
  valid_until: string | null;
  estimated_timeline: string | null;
  terms: string | null;
  internal_notes: string | null;
  status: string;
  sent_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  deposit_paid_at: string | null;
  ai_generated: boolean;
  photo_urls: string[];
  converted_order_id: string | null;
  delivery_address: string | null;
  delivery_fee_cents: number;
  delivery_date: string | null;
  delivery_time_window: string | null;
  delivery_notes: string | null;
  // Final-invoice flow (deposit paid, items added post-job, customer pays balance)
  finalized_at: string | null;
  balance_paid_cents: number;
  balance_paid_at: string | null;
  invoice_sent_at: string | null;
}

const TAX_RATE = 0.0875;

function centsToStr(c: number): string { return (c / 100).toFixed(2); }
function strToCents(s: string): number { return Math.round(parseFloat(s || "0") * 100); }

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700" },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-700" },
  viewed: { label: "Viewed", color: "bg-purple-100 text-purple-700" },
  accepted: { label: "Accepted ✓", color: "bg-green-100 text-green-700" },
  declined: { label: "Declined", color: "bg-red-100 text-red-700" },
  expired: { label: "Expired", color: "bg-amber-100 text-amber-700" },
  converted: { label: "Converted", color: "bg-teal-100 text-teal-700" },
};

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [converting, setConverting] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);

  // Manually record a deposit paid outside the site (Stripe link, phone, keyed-in)
  const [showRecordDeposit, setShowRecordDeposit] = useState(false);
  const [recordDepositAmount, setRecordDepositAmount] = useState("");
  const [recordDepositPi, setRecordDepositPi] = useState("");
  const [recordDepositDate, setRecordDepositDate] = useState("");
  const [recordingDeposit, setRecordingDeposit] = useState(false);

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [depositInput, setDepositInput] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [timeline, setTimeline] = useState("");
  const [terms, setTerms] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryFeeCents, setDeliveryFeeCents] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTimeWindow, setDeliveryTimeWindow] = useState("flexible");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [taxExempt, setTaxExempt] = useState(false);
  const [taxExemptCert, setTaxExemptCert] = useState("");

  async function loadQuote() {
    setLoading(true);
    const r = await fetch(`/api/admin/quotes/${id}`);
    const d = await r.json();
    if (r.ok && d.quote) {
      const q: Quote = d.quote;
      setQuote(q);
      setCustomerName(q.customer_name);
      setCustomerPhone(q.customer_phone ?? "");
      setCustomerEmail(q.customer_email ?? "");
      setCustomerAddress(q.customer_address ?? "");
      setTitle(q.title);
      setDescription(q.description ?? "");
      setLineItems(q.line_items ?? []);
      setDepositInput(centsToStr(q.deposit_required_cents));
      setValidUntil(q.valid_until ?? "");
      setTimeline(q.estimated_timeline ?? "");
      setTerms(q.terms ?? "");
      setInternalNotes(q.internal_notes ?? "");
      setDeliveryMethod(q.delivery_address ? "delivery" : "pickup");
      setDeliveryAddress(q.delivery_address ?? "");
      setDeliveryFeeCents(centsToStr(q.delivery_fee_cents ?? 0));
      setDeliveryDate(q.delivery_date ?? "");
      setDeliveryTimeWindow(q.delivery_time_window ?? "flexible");
      setDeliveryNotes(q.delivery_notes ?? "");
      setTaxExempt(q.tax_exempt ?? false);
      setTaxExemptCert(q.tax_exempt_certificate ?? "");
      setPhotoUrls(q.photo_urls ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { loadQuote(); }, [id]);

  function recalcTotals(items: LineItem[]) {
    const subtotal = items.reduce((s, i) => s + i.total_cents, 0);
    const delFee = deliveryMethod === "delivery" ? strToCents(deliveryFeeCents) : 0;
    // NY: tax applies to materials + delivery (skip if tax exempt)
    const tax = taxExempt ? 0 : Math.round((subtotal + delFee) * TAX_RATE);
    return { subtotal, tax, total: subtotal + delFee + tax };
  }

  function updateItem(idx: number, field: keyof LineItem, value: unknown) {
    setLineItems((prev) => {
      const next = [...prev];
      const item = { ...next[idx], [field]: value };
      // Auto-calc total
      if (field === "quantity" || field === "unit_price_cents") {
        item.total_cents = Math.round((item.quantity ?? 0) * (item.unit_price_cents ?? 0));
      }
      next[idx] = item;
      return next;
    });
  }

  function addItem() {
    setLineItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unit: "job", unit_price_cents: 0, total_cents: 0 },
    ]);
  }

  function removeItem(idx: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setSaving(true);
    const { subtotal, tax, total } = recalcTotals(lineItems);
    const body = {
      customer_name: customerName,
      customer_phone: customerPhone || null,
      customer_email: customerEmail || null,
      customer_address: customerAddress || null,
      title,
      description: description || null,
      line_items: lineItems,
      subtotal_cents: subtotal,
      tax_cents: tax,
      total_cents: total,
      deposit_required_cents: strToCents(depositInput),
      valid_until: validUntil || null,
      estimated_timeline: timeline || null,
      terms: terms || null,
      internal_notes: internalNotes || null,
      delivery_address: deliveryMethod === "delivery" ? (deliveryAddress || null) : null,
      delivery_fee_cents: deliveryMethod === "delivery" ? strToCents(deliveryFeeCents) : 0,
      delivery_date: deliveryMethod === "delivery" ? (deliveryDate || null) : null,
      delivery_time_window: deliveryMethod === "delivery" ? (deliveryTimeWindow || null) : null,
      delivery_notes: deliveryMethod === "delivery" ? (deliveryNotes || null) : null,
      tax_exempt: taxExempt,
      tax_exempt_certificate: taxExemptCert || null,
      photo_urls: photoUrls,
    };
    const r = await fetch(`/api/admin/quotes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) await loadQuote();
    else alert("Save failed");
    setSaving(false);
  }

  async function handleSend(via: string[]) {
    if (!via.length) return;
    setSending(true);
    await handleSave();
    const r = await fetch(`/api/admin/quotes/${id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ via }),
    });
    const d = await r.json();
    setSending(false);
    if (d.errors?.length) alert("Partial send: " + d.errors.join(", "));
    await loadQuote();
  }

  function getQuoteUrl() {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    return `${base}/quote/${quote?.public_token}`;
  }

  async function copyLink() {
    await navigator.clipboard.writeText(getQuoteUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handlePhotoUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploadingPhoto(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("bucket", "quote-photos");
        fd.append("quoteId", id);
        const r = await fetch("/api/admin/quotes/upload-photo", { method: "POST", body: fd });
        const d = await r.json();
        if (r.ok && d.url) {
          setPhotoUrls((prev) => [...prev, d.url]);
        }
      }
    } catch {
      alert("Photo upload failed");
    }
    setUploadingPhoto(false);
  }

  function removePhoto(idx: number) {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleFinalizeInvoice() {
    if (!confirm("Finalize this quote as an invoice? This locks the current line items as billable and lets the customer pay the balance.")) return;
    setSaving(true);
    await handleSave();
    const r = await fetch(`/api/admin/quotes/${id}/finalize`, { method: "POST" });
    const d = await r.json();
    setSaving(false);
    if (!r.ok) {
      alert(d.error ?? "Finalize failed");
      return;
    }
    await loadQuote();
  }

  async function handleSendInvoice(via: string[]) {
    if (!via.length) return;
    setSending(true);
    const r = await fetch(`/api/admin/quotes/${id}/send-invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ via }),
    });
    const d = await r.json();
    setSending(false);
    if (d.errors?.length) alert("Partial send: " + d.errors.join(", "));
    await loadQuote();
  }

  async function handleRecordDeposit() {
    const cents = strToCents(recordDepositAmount);
    if (!cents || cents <= 0) {
      alert("Enter the deposit amount (excluding the card fee).");
      return;
    }
    setRecordingDeposit(true);
    const r = await fetch(`/api/admin/quotes/${id}/record-deposit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        depositCents: cents,
        stripePaymentIntentId: recordDepositPi.trim() || undefined,
        paidAt: recordDepositDate || undefined,
      }),
    });
    const d = await r.json();
    setRecordingDeposit(false);
    if (!r.ok) {
      alert(d.error ?? "Failed to record deposit");
      return;
    }
    if (d.note) alert(d.note);
    setShowRecordDeposit(false);
    setRecordDepositPi("");
    setRecordDepositDate("");
    await loadQuote();
  }

  async function handleConvertToOrder() {
    if (!confirm("Convert this quote to an order? This will create a new order from the quote line items.")) return;
    setConverting(true);
    const r = await fetch(`/api/admin/quotes/${id}/convert`, { method: "POST" });
    const d = await r.json();
    setConverting(false);
    if (r.ok && d.orderId) {
      await loadQuote();
      alert(`Order created! ID: ${d.orderId}`);
    } else {
      alert(d.error ?? "Conversion failed");
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this quote?")) return;
    await fetch(`/api/admin/quotes/${id}`, { method: "DELETE" });
    router.push("/admin/quotes");
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quote) return <div className="p-6 text-destructive">Quote not found.</div>;

  const { subtotal, tax, total } = recalcTotals(lineItems);
  const statusCfg = STATUS_CONFIG[quote.status] ?? STATUS_CONFIG.draft;
  // Accepted quotes with deposit paid remain editable so admin can add post-job items
  // before finalizing into a balance-due invoice. Declined / fully-converted stay locked.
  const isReadOnly = ["declined", "converted"].includes(quote.status);
  const isAcceptedWithDeposit = quote.status === "accepted" && !!quote.deposit_paid_at;
  const balanceOwedCents = Math.max(0, total - (quote.deposit_paid_cents || 0) - (quote.balance_paid_cents || 0));
  const fullyPaid = balanceOwedCents === 0 && !!quote.deposit_paid_at;
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const quoteUrl = `${siteUrl}/quote/${quote.public_token}`;

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/quotes" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{quote.quote_number}</h1>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
          {quote.ai_generated && (
            <Badge variant="outline" className="text-purple-600 border-purple-200">
              <Sparkles className="mr-1 size-3" />AI Generated
            </Badge>
          )}
          {quote.deposit_paid_at && (
            <Badge variant="outline" className="text-green-600 border-green-200">
              <CheckCircle className="mr-1 size-3" />Deposit Paid
            </Badge>
          )}
          {quote.finalized_at && !fullyPaid && (
            <Badge variant="outline" className="text-amber-700 border-amber-300">
              <DollarSign className="mr-1 size-3" />Invoice Finalized
            </Badge>
          )}
          {fullyPaid && (
            <Badge variant="outline" className="text-green-700 border-green-300">
              <CheckCircle className="mr-1 size-3" />Paid in Full
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyLink}>
            <Copy className="mr-1.5 size-3.5" />{copied ? "Copied!" : "Copy Link"}
          </Button>
          <a href={quoteUrl} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-1.5 size-3.5" />Preview
            </Button>
          </a>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 size-3.5" />Print
          </Button>
          {!isReadOnly && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Send Quote bar — only for pre-acceptance states. After deposit, use the Final Invoice flow instead. */}
      {["draft", "sent", "viewed", "expired"].includes(quote.status) && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
          <p className="flex-1 text-sm text-muted-foreground">
            {quote.status === "draft" ? "Ready to send?" : `Last sent: ${quote.sent_at ? new Date(quote.sent_at).toLocaleDateString() : "—"}`}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSend(["sms"])}
            disabled={sending || !customerPhone}
          >
            <Send className="mr-1.5 size-3.5" />Text
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSend(["email"])}
            disabled={sending || !customerEmail}
          >
            <Send className="mr-1.5 size-3.5" />Email
          </Button>
          <Button
            size="sm"
            onClick={() => handleSend(["sms", "email"])}
            disabled={sending || (!customerPhone && !customerEmail)}
          >
            {sending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-1.5 size-4" />}
            Send Both
          </Button>
        </div>
      )}

      {/* Status badges for accepted/declined */}
      {quote.status === "accepted" && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle className="size-5 text-green-600" />
          <div>
            <p className="font-medium text-green-800">Quote Accepted</p>
            <p className="text-sm text-green-700">
              {quote.accepted_at ? new Date(quote.accepted_at).toLocaleString() : ""}
              {quote.deposit_paid_at ? ` · Deposit paid ${new Date(quote.deposit_paid_at).toLocaleDateString()}` : " · Deposit pending"}
            </p>
          </div>
        </div>
      )}
      {quote.status === "declined" && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <XCircle className="size-5 text-red-600" />
          <p className="font-medium text-red-800">Quote Declined</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: form */}
        <div className="space-y-6 lg:col-span-2">
          {/* Customer */}
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <h3 className="font-semibold">Customer</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Name *</label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} disabled={isReadOnly} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Phone</label>
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} disabled={isReadOnly} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Email</label>
                <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} disabled={isReadOnly} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Address</label>
                <Input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} disabled={isReadOnly} />
              </div>
            </div>
          </div>

          {/* Job Details */}
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <h3 className="font-semibold">Job Details</h3>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={isReadOnly} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isReadOnly}
                className="w-full min-h-[80px] rounded-lg border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-y disabled:opacity-60"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Timeline</label>
                <Input value={timeline} onChange={(e) => setTimeline(e.target.value)} disabled={isReadOnly} placeholder="e.g. 2-3 business days" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Valid Until</label>
                <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} disabled={isReadOnly} />
              </div>
            </div>
          </div>

          {/* Delivery / Pickup */}
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <h3 className="font-semibold">Delivery</h3>
            <div className="flex gap-2">
              {(["pickup", "delivery"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => !isReadOnly && setDeliveryMethod(m)}
                  disabled={isReadOnly}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                    deliveryMethod === m
                      ? "border-accent bg-accent/10 text-accent-foreground"
                      : "border-border text-muted-foreground hover:border-accent/40"
                  } disabled:opacity-60`}
                >
                  {m === "pickup" ? <Store className="size-4" /> : <Truck className="size-4" />}
                  {m === "pickup" ? "Pickup at Yard" : "Delivery"}
                </button>
              ))}
            </div>
            {deliveryMethod === "delivery" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs text-muted-foreground">Delivery Address</label>
                  <Input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} disabled={isReadOnly} placeholder="Full delivery address" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Delivery Fee</label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                    <Input className="pl-7" value={deliveryFeeCents} onChange={(e) => setDeliveryFeeCents(e.target.value)} disabled={isReadOnly} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Delivery Date</label>
                  <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} disabled={isReadOnly} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Time Window</label>
                  <select
                    value={deliveryTimeWindow}
                    onChange={(e) => setDeliveryTimeWindow(e.target.value)}
                    disabled={isReadOnly}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:opacity-60"
                  >
                    <option value="morning">Morning (7 AM – 10 AM)</option>
                    <option value="midday">Midday (10 AM – 1 PM)</option>
                    <option value="afternoon">Afternoon (1 PM – 5 PM)</option>
                    <option value="flexible">Flexible (7 AM – 5 PM)</option>
                  </select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs text-muted-foreground">Delivery Notes</label>
                  <Input value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} disabled={isReadOnly} placeholder="Gate code, driveway instructions..." />
                </div>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Line Items</h3>
              {!isReadOnly && (
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="mr-1 size-3.5" />Add Item
                </Button>
              )}
            </div>

            {lineItems.map((item, idx) => (
              <div key={idx} className="rounded-lg border bg-background p-3 space-y-2">
                {/* Row 1: Description (full width) */}
                <div className="flex items-center gap-2">
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(idx, "description", e.target.value)}
                    disabled={isReadOnly}
                    placeholder="Item description"
                    className="flex-1"
                  />
                  {!isReadOnly && (
                    <Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeItem(idx)}>
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
                {/* Row 2: Qty, Unit, Unit Price, Total */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Qty</label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Unit</label>
                    <Input
                      value={item.unit}
                      onChange={(e) => updateItem(idx, "unit", e.target.value)}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Unit Price</label>
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-2.5 size-3 text-muted-foreground" />
                      <Input
                        className="pl-5"
                        value={centsToStr(item.unit_price_cents)}
                        onChange={(e) => updateItem(idx, "unit_price_cents", strToCents(e.target.value))}
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">Total</label>
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-2.5 size-3 text-muted-foreground" />
                      <Input
                        className="pl-5"
                        value={centsToStr(item.total_cents)}
                        onChange={(e) => updateItem(idx, "total_cents", strToCents(e.target.value))}
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {lineItems.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">No line items.</p>
            )}
          </div>

          {/* Terms */}
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <h3 className="font-semibold">Terms & Notes</h3>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Terms (shown to customer)</label>
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                disabled={isReadOnly}
                className="w-full min-h-[60px] rounded-lg border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-y disabled:opacity-60"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Internal Notes (staff only)</label>
              <textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                className="w-full min-h-[60px] rounded-lg border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-y"
              />
            </div>
          </div>
          {/* Photos */}
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Photos</h3>
              {!isReadOnly && (
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Upload className="mr-1 size-3.5" />
                      {uploadingPhoto ? "Uploading..." : "Add Photos"}
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e.target.files)}
                    disabled={uploadingPhoto}
                  />
                </label>
              )}
            </div>
            {photoUrls.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {photoUrls.map((url, i) => (
                  <div key={i} className="group relative rounded-lg overflow-hidden border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Quote photo ${i + 1}`} className="aspect-square w-full object-cover" />
                    {!isReadOnly && (
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                <ImageIcon className="mx-auto mb-1 size-6 text-muted-foreground/40" />
                No photos attached
              </p>
            )}
          </div>
        </div>

        {/* Right: pricing summary */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-5 space-y-3 sticky top-6">
            <h3 className="font-semibold">Pricing</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatUsd(subtotal)}</span>
              </div>
              {deliveryMethod === "delivery" && strToCents(deliveryFeeCents) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span>{formatUsd(strToCents(deliveryFeeCents))}</span>
                </div>
              )}
              {/* Tax exempt toggle */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxExempt}
                    onChange={(e) => setTaxExempt(e.target.checked)}
                    disabled={isReadOnly}
                    className="rounded"
                  />
                  Tax Exempt
                </label>
                {!taxExempt && <span>{formatUsd(tax)}</span>}
                {taxExempt && <span className="text-green-600 text-xs font-medium">EXEMPT</span>}
              </div>
              {taxExempt && !isReadOnly && (
                <div>
                  <Input
                    placeholder="Tax exempt certificate #"
                    value={taxExemptCert}
                    onChange={(e) => setTaxExemptCert(e.target.value)}
                    className="text-xs h-8"
                  />
                </div>
              )}
              {taxExempt && isReadOnly && taxExemptCert && (
                <p className="text-xs text-muted-foreground">Cert: {taxExemptCert}</p>
              )}
              <div className="flex justify-between border-t pt-2 font-semibold text-base">
                <span>Total</span>
                <span>{formatUsd(total)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Deposit Required</label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  className="pl-7"
                  value={depositInput}
                  onChange={(e) => setDepositInput(e.target.value)}
                  disabled={isReadOnly}
                />
              </div>
            </div>

            {quote.deposit_paid_at && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                <strong>Deposit paid:</strong> {formatUsd(quote.deposit_paid_cents)} on {new Date(quote.deposit_paid_at).toLocaleDateString()}
              </div>
            )}

            {quote.balance_paid_at && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                <strong>Balance paid:</strong> {formatUsd(quote.balance_paid_cents)} on {new Date(quote.balance_paid_at).toLocaleDateString()}
              </div>
            )}

            {/* Balance / final invoice section */}
            {quote.deposit_paid_at && (
              <div className="rounded-lg border bg-card p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deposit paid</span>
                  <span className="text-green-600">-{formatUsd(quote.deposit_paid_cents)}</span>
                </div>
                {(quote.balance_paid_cents ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Balance paid</span>
                    <span className="text-green-600">-{formatUsd(quote.balance_paid_cents)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Balance Owed</span>
                  <span className={balanceOwedCents > 0 ? "text-amber-700" : "text-green-700"}>
                    {formatUsd(balanceOwedCents)}
                  </span>
                </div>
                {fullyPaid && (
                  <p className="text-xs text-green-700 font-medium">✓ Fully paid</p>
                )}
              </div>
            )}

            {/* Finalize / Send Invoice actions */}
            {isAcceptedWithDeposit && balanceOwedCents > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                <p className="text-xs font-semibold text-amber-900">Final Invoice</p>
                {!quote.finalized_at ? (
                  <>
                    <p className="text-xs text-amber-800">
                      Add any post-job items, then finalize to lock the invoice and send the customer a balance pay link.
                    </p>
                    <Button
                      size="sm"
                      className="w-full bg-amber-600 hover:bg-amber-700"
                      onClick={handleFinalizeInvoice}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      Finalize Invoice
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-amber-800">
                      Finalized {new Date(quote.finalized_at).toLocaleDateString()}.
                      {quote.invoice_sent_at && ` Last sent ${new Date(quote.invoice_sent_at).toLocaleDateString()}.`}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendInvoice(["sms"])}
                        disabled={sending || !customerPhone}
                      >
                        <Send className="mr-1 size-3" />Text
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendInvoice(["email"])}
                        disabled={sending || !customerEmail}
                      >
                        <Send className="mr-1 size-3" />Email
                      </Button>
                      <Button
                        size="sm"
                        className="col-span-2 bg-amber-600 hover:bg-amber-700"
                        onClick={() => handleSendInvoice(["sms", "email"])}
                        disabled={sending || (!customerPhone && !customerEmail)}
                      >
                        {sending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-1.5 size-4" />}
                        Send Invoice (Email + SMS)
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="border-t pt-3 space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Quote Link</p>
              <code className="block rounded bg-muted p-2 text-xs break-all">{quoteUrl}</code>
              <Button variant="outline" size="sm" className="w-full" onClick={copyLink}>
                <Copy className="mr-1.5 size-3.5" />{copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-lg border bg-card p-4 space-y-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground text-sm">Timeline</p>
            <div className="flex items-center gap-2">
              <Clock className="size-3" />
              <span>Created {new Date(quote.id).getTime() ? new Date(quote.id).toLocaleDateString() : "—"}</span>
            </div>
            {quote.sent_at && <div className="flex items-center gap-2"><Send className="size-3" /><span>Sent {new Date(quote.sent_at).toLocaleDateString()}</span></div>}
            {quote.accepted_at && <div className="flex items-center gap-2"><CheckCircle className="size-3 text-green-500" /><span>Accepted {new Date(quote.accepted_at).toLocaleDateString()}</span></div>}
            {quote.declined_at && <div className="flex items-center gap-2"><XCircle className="size-3 text-red-500" /><span>Declined {new Date(quote.declined_at).toLocaleDateString()}</span></div>}
            {quote.deposit_paid_at && <div className="flex items-center gap-2"><DollarSign className="size-3 text-green-500" /><span>Deposit paid {new Date(quote.deposit_paid_at).toLocaleDateString()}</span></div>}
          </div>

          {/* Record Deposit — deposit was paid outside the site (Stripe link, phone, keyed-in).
              Recording it unlocks the Final Invoice → balance pay-link flow. */}
          {!quote.deposit_paid_at && !quote.converted_order_id &&
            !["declined", "disabled", "scammer"].includes(quote.status) && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
              {!showRecordDeposit ? (
                <>
                  <p className="text-xs font-semibold text-blue-900">Deposit paid outside the site?</p>
                  <p className="text-xs text-blue-800">
                    Record a deposit collected via a Stripe link, phone, or keyed-in card to
                    certify the job complete and send a balance pay link.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-blue-300 text-blue-800 hover:bg-blue-100"
                    onClick={() => {
                      setRecordDepositAmount(
                        quote.deposit_required_cents > 0 ? centsToStr(quote.deposit_required_cents) : "",
                      );
                      setShowRecordDeposit(true);
                    }}
                  >
                    <DollarSign className="mr-1.5 size-4" />Record Deposit
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-blue-900">Record Deposit</p>
                  <div className="space-y-1">
                    <label className="text-[11px] text-blue-800">Deposit amount (excl. card fee)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                      <Input
                        className="pl-7"
                        value={recordDepositAmount}
                        onChange={(e) => setRecordDepositAmount(e.target.value)}
                        placeholder="2650.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-blue-800">Stripe payment ID (optional)</label>
                    <Input
                      value={recordDepositPi}
                      onChange={(e) => setRecordDepositPi(e.target.value)}
                      placeholder="pi_..."
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-blue-800">Paid on (optional)</label>
                    <Input
                      type="date"
                      value={recordDepositDate}
                      onChange={(e) => setRecordDepositDate(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowRecordDeposit(false)}
                      disabled={recordingDeposit}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={handleRecordDeposit}
                      disabled={recordingDeposit}
                    >
                      {recordingDeposit ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
                      Save
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Charge Card — manually key in the customer's card to take payment now */}
          {!quote.converted_order_id && !quote.deposit_paid_at && ["accepted", "sent", "viewed"].includes(quote.status) && (
            <Button
              className="w-full bg-amber-600 hover:bg-amber-500 text-white"
              size="sm"
              onClick={() => setShowChargeModal(true)}
            >
              <DollarSign className="mr-1.5 size-4" />
              Charge Card (Full Amount)
            </Button>
          )}

          {/* Convert to Order (for accepted quotes) */}
          {quote.status === "accepted" && !quote.converted_order_id && (
            <Button
              className="w-full bg-green-600 hover:bg-green-500 text-white"
              size="sm"
              onClick={handleConvertToOrder}
              disabled={converting}
            >
              {converting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ArrowRight className="mr-1.5 size-4" />}
              Convert to Order
            </Button>
          )}
          {quote.converted_order_id && (
            <Link href={`/admin/operations`}>
              <Button variant="outline" size="sm" className="w-full text-green-600">
                <CheckCircle className="mr-1.5 size-4" /> View Order
              </Button>
            </Link>
          )}

          <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive" onClick={handleDelete}>
            Delete Quote
          </Button>
        </div>
      </div>

      {showChargeModal && (
        <ChargeQuoteModal
          quoteId={quote.id}
          quoteNumber={quote.quote_number}
          customerName={quote.customer_name}
          onClose={() => setShowChargeModal(false)}
          onSuccess={async (orderId) => {
            setShowChargeModal(false);
            await loadQuote();
            alert(`Payment captured — paid order created! ID: ${orderId}`);
          }}
        />
      )}
    </div>
  );
}
