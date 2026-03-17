"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Send, Printer, Copy, CheckCircle, DollarSign, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/format";

interface Order {
  id: string;
  order_number?: string;
  placed_at: string;
  grand_total_cents: number;
  delivery_method: string;
  items?: Array<{ product_name: string; quantity: number; unit_price_cents: number }>;
}

interface Statement {
  id: string;
  statement_number: string;
  public_token: string;
  period_start: string;
  period_end: string;
  previous_balance_cents: number;
  charges_cents: number;
  payments_cents: number;
  balance_due_cents: number;
  amount_paid_cents: number;
  due_date: string;
  status: string;
  sent_at: string | null;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  customers: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    charge_account_name: string | null;
    billing_email: string | null;
    billing_address: string | null;
    payment_terms: string | null;
    current_balance_cents: number;
    phone: string | null;
  } | null;
}

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-purple-100 text-purple-700",
  partial_paid: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
};

export default function StatementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [stmt, setStmt] = useState<Statement | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMarkPaid, setShowMarkPaid] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("check");
  const [payRef, setPayRef] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load() {
    const r = await fetch(`/api/admin/statements/${id}`);
    const d = await r.json();
    if (r.ok) {
      setStmt(d.statement);
      setOrders(d.orders ?? []);
      setPayAmount(((d.statement.balance_due_cents ?? 0) / 100).toFixed(2));
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function handleSend(via: string[]) {
    setSending(true);
    const r = await fetch(`/api/admin/statements/${id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ via }),
    });
    const d = await r.json();
    if (d.errors?.length) alert("Partial send: " + d.errors.join(", "));
    await load();
    setSending(false);
  }

  async function handleMarkPaid() {
    setSaving(true);
    await fetch(`/api/admin/statements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mark_paid: true,
        amount_cents: Math.round(parseFloat(payAmount) * 100),
        method: payMethod,
        reference: payRef || null,
      }),
    });
    setShowMarkPaid(false);
    setSaving(false);
    await load();
  }

  async function copyPayLink() {
    if (!stmt) return;
    const siteUrl = window.location.origin;
    await navigator.clipboard.writeText(`${siteUrl}/pay/${stmt.public_token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!stmt) return <div className="p-6 text-destructive">Statement not found.</div>;

  const customer = stmt.customers;
  const accountName = customer?.charge_account_name ?? [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") ?? "Unknown";
  const payUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/pay/${stmt.public_token}`;

  return (
    <div className="max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/statements" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-semibold font-mono">{stmt.statement_number}</h1>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[stmt.status] ?? "bg-gray-100 text-gray-700"}`}>
          {stmt.status}
        </span>
        <div className="ml-auto flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 size-3.5" />Print
          </Button>
          <Button variant="outline" size="sm" onClick={copyPayLink}>
            <Copy className="mr-1.5 size-3.5" />{copied ? "Copied!" : "Payment Link"}
          </Button>
          <a href={payUrl} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm"><ExternalLink className="mr-1.5 size-3.5" />Preview</Button>
          </a>
          {stmt.status !== "paid" && (
            <Button size="sm" onClick={() => setShowMarkPaid(true)}>
              <DollarSign className="mr-1.5 size-4" />Mark Paid
            </Button>
          )}
        </div>
      </div>

      {/* Send bar */}
      {["draft", "sent", "viewed", "partial_paid"].includes(stmt.status) && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
          <p className="flex-1 text-sm text-muted-foreground">
            {stmt.sent_at ? `Last sent: ${new Date(stmt.sent_at).toLocaleDateString()}` : "Ready to send?"}
          </p>
          <Button variant="outline" size="sm" disabled={sending || !customer?.phone} onClick={() => handleSend(["sms"])}>
            <Send className="mr-1.5 size-3.5" />Text
          </Button>
          <Button variant="outline" size="sm" disabled={sending || !customer?.billing_email} onClick={() => handleSend(["email"])}>
            <Send className="mr-1.5 size-3.5" />Email
          </Button>
          <Button size="sm" disabled={sending} onClick={() => handleSend(["sms", "email"])}>
            {sending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-1.5 size-4" />}
            Send Both
          </Button>
        </div>
      )}

      {/* Paid banner */}
      {stmt.status === "paid" && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle className="size-5 text-green-600" />
          <div>
            <p className="font-medium text-green-800">Paid in Full</p>
            <p className="text-sm text-green-700">
              {stmt.paid_at ? new Date(stmt.paid_at).toLocaleDateString() : ""}
              {stmt.payment_method ? ` · ${stmt.payment_method}` : ""}
              {stmt.payment_reference ? ` · Ref: ${stmt.payment_reference}` : ""}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          {/* Bill to + statement info */}
          <div className="rounded-lg border bg-card p-5 grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Bill To</p>
              <p className="font-semibold">{accountName}</p>
              {customer?.billing_address && <p className="text-muted-foreground">{customer.billing_address}</p>}
              {customer?.phone && <p className="text-muted-foreground">{customer.phone}</p>}
              {customer?.billing_email && <p className="text-muted-foreground">{customer.billing_email}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Details</p>
              <p>Period: {stmt.period_start} – {stmt.period_end}</p>
              <p>Due: {stmt.due_date}</p>
              <p>Terms: {customer?.payment_terms ?? "Net 30"}</p>
            </div>
          </div>

          {/* Orders */}
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <h3 className="font-semibold">Orders ({orders.length})</h3>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders found for this period.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs uppercase">
                    <th className="pb-2 text-left">Date</th>
                    <th className="pb-2 text-left">Order #</th>
                    <th className="pb-2 text-left">Type</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="py-2">{new Date(o.placed_at).toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}</td>
                      <td className="py-2 font-mono text-xs">#{o.order_number ?? o.id.slice(0, 8)}</td>
                      <td className="py-2 capitalize text-muted-foreground">{o.delivery_method}</td>
                      <td className="py-2 text-right font-medium">{formatUsd(o.grand_total_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: totals */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-5 space-y-3 text-sm sticky top-6">
            <h3 className="font-semibold">Summary</h3>
            <div className="space-y-2">
              {stmt.previous_balance_cents > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Previous Balance</span><span>{formatUsd(stmt.previous_balance_cents)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">New Charges</span><span>{formatUsd(stmt.charges_cents)}</span>
              </div>
              {stmt.payments_cents > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Payments</span><span>−{formatUsd(stmt.payments_cents)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 font-bold text-base">
                <span>Balance Due</span><span>{formatUsd(stmt.balance_due_cents)}</span>
              </div>
              {stmt.amount_paid_cents > 0 && (
                <div className="flex justify-between text-green-600 text-xs">
                  <span>Paid</span><span>{formatUsd(stmt.amount_paid_cents)}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-3 space-y-1 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Payment Link</p>
              <code className="block rounded bg-muted p-1.5 break-all text-xs">{payUrl}</code>
            </div>
          </div>
        </div>
      </div>

      {/* Mark Paid Modal */}
      {showMarkPaid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border bg-card p-6 space-y-4 shadow-xl">
            <h2 className="font-semibold">Mark as Paid</h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                  <Input className="pl-7" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer / ACH</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Reference # (optional)</label>
                <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Check # or transaction ID" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowMarkPaid(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleMarkPaid} disabled={saving}>
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle className="mr-2 size-4" />}
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
