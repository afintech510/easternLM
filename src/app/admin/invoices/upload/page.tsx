"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Supplier {
  id: string;
  name: string;
}

export default function InvoiceUploadPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/suppliers")
      .then((r) => r.json())
      .then((d) => {
        const list = d.suppliers ?? [];
        setSuppliers(list);
        if (list.length === 1) setSelectedSupplier(list[0].id);
      })
      .finally(() => setLoadingSuppliers(false));
  }, []);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    if (!selectedSupplier) {
      setError("Select a supplier first.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      for (const f of Array.from(files)) fd.append("files", f);
      const r = await fetch(`/api/admin/suppliers/${selectedSupplier}/invoices`, {
        method: "POST",
        body: fd,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (d.invoice?.id) router.push(`/admin/invoices/${d.invoice.id}`);
    } catch (e) {
      setError("Upload failed: " + (e instanceof Error ? e.message : "Unknown error"));
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
    <div className="space-y-6">
      <div>
        <h1 className="[font-family:var(--font-display)] text-3xl text-primary">Upload Invoice</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a supplier invoice (PDF or photo) for AI-powered data extraction.
        </p>
      </div>

      {/* Supplier picker */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Supplier</label>
        {loadingSuppliers ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading suppliers…
          </div>
        ) : suppliers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No suppliers found.{" "}
            <a href="/admin/suppliers" className="text-accent underline">
              Create a supplier first.
            </a>
          </p>
        ) : (
          <select
            value={selectedSupplier}
            onChange={(e) => {
              setSelectedSupplier(e.target.value);
              setError("");
            }}
            className="w-full max-w-sm rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Select supplier…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Upload zone */}
      <div
        className={`relative rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
          dragging
            ? "border-accent bg-accent/5"
            : "border-border bg-muted/20 hover:border-muted-foreground/40"
        } ${!selectedSupplier ? "opacity-50 pointer-events-none" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && selectedSupplier && fileRef.current?.click()}
        style={{ cursor: uploading || !selectedSupplier ? "default" : "pointer" }}
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
            <Loader2 className="size-10 animate-spin text-accent" />
            <p className="text-sm font-medium">Uploading & starting extraction…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="size-10 text-muted-foreground" />
            <div>
              <p className="font-medium">Drop invoice files here</p>
              <p className="text-sm text-muted-foreground">
                PDF, JPG, or PNG — one or multiple pages per invoice
              </p>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="size-3.5" /> PDF invoices
              </span>
              <span className="flex items-center gap-1">
                <ImageIcon className="size-3.5" /> Phone photos
              </span>
            </div>
            <Button variant="outline" size="sm" className="mt-1">
              Browse Files
            </Button>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        After uploading, the AI will extract invoice number, date, line items, and totals automatically.
        You can review and confirm the extracted data before it updates supplier pricing.
      </p>
    </div>
  );
}
