"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, AlertCircle, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/format";

interface Invoice {
  id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  total_amount_cents: number | null;
  ocr_status: string;
  is_paid: boolean;
  created_at: string;
  supplier_id: string;
  suppliers: { name: string } | null;
}

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "extracted", label: "Needs Review" },
  { value: "confirmed", label: "Confirmed" },
  { value: "failed", label: "Failed" },
];

function StatusIcon({ status }: { status: string }) {
  if (status === "confirmed") return <CheckCircle className="size-4 text-green-500" />;
  if (status === "failed") return <XCircle className="size-4 text-destructive" />;
  if (status === "processing") return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
  if (status === "extracted") return <AlertCircle className="size-4 text-amber-500" />;
  return <Clock className="size-4 text-muted-foreground" />;
}

export default function InvoicesDashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [paidFilter, setPaidFilter] = useState<"" | "paid" | "unpaid">("");

  async function loadInvoices() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (paidFilter) params.set("is_paid", paidFilter === "paid" ? "true" : "false");
    const r = await fetch(`/api/admin/invoices?${params}`);
    const d = await r.json();
    setInvoices(d.invoices ?? []);
    setLoading(false);
  }

  useEffect(() => { loadInvoices(); }, [statusFilter, paidFilter]);

  const totalUnpaid = invoices
    .filter((i) => !i.is_paid && i.ocr_status === "confirmed")
    .reduce((s, i) => s + (i.total_amount_cents ?? 0), 0);

  const needsReview = invoices.filter((i) => i.ocr_status === "extracted").length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Invoices</h1>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Needs Review</p>
          <p className="text-2xl font-semibold">{needsReview}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Unpaid (confirmed)</p>
          <p className="text-2xl font-semibold">{formatUsd(totalUnpaid)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total Invoices</p>
          <p className="text-2xl font-semibold">{invoices.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-1 border-l pl-3">
          {(["", "paid", "unpaid"] as const).map((v) => (
            <Button
              key={v}
              variant={paidFilter === v ? "default" : "outline"}
              size="sm"
              onClick={() => setPaidFilter(v)}
            >
              {v === "" ? "All" : v === "paid" ? "Paid" : "Unpaid"}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <FileText className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No invoices found</p>
          <Link href="/admin/suppliers">
            <Button variant="outline" size="sm">Go to Suppliers</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-1">
          {invoices.map((inv) => (
            <Link
              key={inv.id}
              href={`/admin/invoices/${inv.id}`}
              className="flex items-center gap-4 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-muted/30"
            >
              <StatusIcon status={inv.ocr_status} />
              <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-medium">
                  {inv.invoice_number ? `#${inv.invoice_number}` : <span className="text-muted-foreground">No #</span>}
                </span>
                <span className="text-sm text-muted-foreground">{inv.suppliers?.name ?? <span className="italic text-muted-foreground/60">Unassigned</span>}</span>
                {inv.invoice_date && (
                  <span className="text-sm text-muted-foreground">{inv.invoice_date}</span>
                )}
                {inv.total_amount_cents != null && (
                  <span className="text-sm font-medium">{formatUsd(inv.total_amount_cents)}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {inv.is_paid ? (
                  <Badge variant="outline" className="text-green-600 border-green-200">Paid</Badge>
                ) : (
                  inv.ocr_status === "confirmed" && (
                    <Badge variant="outline" className="text-amber-600 border-amber-200">Unpaid</Badge>
                  )
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
