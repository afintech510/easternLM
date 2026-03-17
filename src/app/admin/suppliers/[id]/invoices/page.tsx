"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, FileText, Image, Loader2, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/format";

interface Invoice {
  id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  total_amount_cents: number | null;
  ocr_status: string;
  is_paid: boolean;
  created_at: string;
  file_urls: string[];
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Pending", variant: "secondary" },
    processing: { label: "Processing…", variant: "secondary" },
    extracted: { label: "Needs Review", variant: "outline" },
    confirmed: { label: "Confirmed", variant: "default" },
    failed: { label: "Failed", variant: "destructive" },
  };
  const cfg = map[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "confirmed") return <CheckCircle className="size-4 text-green-500" />;
  if (status === "failed") return <XCircle className="size-4 text-destructive" />;
  if (status === "processing") return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
  if (status === "extracted") return <AlertCircle className="size-4 text-amber-500" />;
  return <Clock className="size-4 text-muted-foreground" />;
}

export default function SupplierInvoicesPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [supplierName, setSupplierName] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/admin/suppliers/${id}`)
      .then((r) => r.json())
      .then((d) => setSupplierName(d.supplier?.name ?? ""));
    loadInvoices();
  }, [id]);

  async function loadInvoices() {
    setLoading(true);
    const r = await fetch(`/api/admin/suppliers/${id}/invoices`);
    const d = await r.json();
    setInvoices(d.invoices ?? []);
    setLoading(false);
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      for (const f of Array.from(files)) fd.append("files", f);
      const r = await fetch(`/api/admin/suppliers/${id}/invoices`, { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await loadInvoices();
      // Navigate to review page immediately
      if (d.invoice?.id) router.push(`/admin/invoices/${d.invoice.id}`);
    } catch (e) {
      alert("Upload failed: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    uploadFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link href={`/admin/suppliers/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Invoices</h1>
          {supplierName && <p className="text-sm text-muted-foreground">{supplierName}</p>}
        </div>
      </div>

      {/* Upload zone */}
      <div
        className={`relative rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragging ? "border-accent bg-accent/5" : "border-border bg-muted/20 hover:border-muted-foreground/40"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileRef.current?.click()}
        style={{ cursor: uploading ? "default" : "pointer" }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          multiple
          className="hidden"
          onChange={(e) => uploadFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="size-8 animate-spin text-accent" />
            <p className="text-sm font-medium">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="size-8 text-muted-foreground" />
            <p className="font-medium">Drop invoice files here</p>
            <p className="text-sm text-muted-foreground">PDF, JPG, or PNG — one or multiple pages</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={(e) => e.stopPropagation()}>
              Browse Files
            </Button>
          </div>
        )}
      </div>

      {/* Invoice list */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          {loading ? "Loading…" : `${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}`}
        </h2>

        {invoices.length === 0 && !loading && (
          <p className="py-8 text-center text-sm text-muted-foreground">No invoices uploaded yet.</p>
        )}

        {invoices.map((inv) => (
          <Link
            key={inv.id}
            href={`/admin/invoices/${inv.id}`}
            className="flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30"
          >
            <StatusIcon status={inv.ocr_status} />
            <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1">
              <span className="font-medium">
                {inv.invoice_number ? `#${inv.invoice_number}` : "No number"}
              </span>
              {inv.invoice_date && (
                <span className="text-sm text-muted-foreground">{inv.invoice_date}</span>
              )}
              {inv.total_amount_cents != null && (
                <span className="text-sm font-medium">{formatUsd(inv.total_amount_cents)}</span>
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {inv.file_urls.some((f) => f.endsWith(".pdf")) ? (
                  <FileText className="size-3" />
                ) : (
                  <Image className="size-3" />
                )}
                {inv.file_urls.length} file{inv.file_urls.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {inv.is_paid && <Badge variant="outline" className="text-green-600 border-green-200">Paid</Badge>}
              <StatusBadge status={inv.ocr_status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
