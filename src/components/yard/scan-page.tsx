"use client";

import { useState } from "react";
import { CheckCircle, Camera, ClipboardList } from "lucide-react";
import { CameraViewfinder } from "./camera-viewfinder";
import { CapturePreview } from "./capture-preview";
import { QuickReview, type ScanMeta } from "./quick-review";

type Phase = "camera" | "preview" | "review" | "done";

interface Props {
  staffId: string;
}

export function ScanPage({ staffId }: Props) {
  const [phase, setPhase] = useState<Phase>("camera");
  const [pages, setPages] = useState<Blob[]>([]);
  const [currentCapture, setCurrentCapture] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);

  function handleCapture(blob: Blob) {
    setCurrentCapture(blob);
    setPhase("preview");
  }

  function handleRetake() {
    setCurrentCapture(null);
    setPhase("camera");
  }

  function handleAcceptPhoto() {
    if (currentCapture) {
      setPages((prev) => [...prev, currentCapture]);
    }
    setCurrentCapture(null);
    // Go to review after first photo — user can add more from review
    setPhase("review");
  }

  function handleAddMore() {
    setPhase("camera");
  }

  async function handleSubmit(meta: ScanMeta) {
    setUploading(true);
    try {
      const fd = new FormData();
      pages.forEach((blob, i) => {
        fd.append("files", blob, `page-${i + 1}.jpg`);
      });
      fd.append("document_type", meta.documentType);
      if (meta.supplierId) fd.append("supplier_id", meta.supplierId);
      if (meta.companyName) fd.append("company_name", meta.companyName);
      if (meta.documentNumber) fd.append("document_number", meta.documentNumber);
      if (meta.address) fd.append("address", meta.address);
      if (meta.productName) fd.append("product_name", meta.productName);
      if (meta.quantity) fd.append("quantity", meta.quantity);
      if (meta.cost) fd.append("cost", meta.cost);
      fd.append("staff_id", staffId);

      const res = await fetch("/api/yard/scan/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      setResultId(data.invoiceId ?? null);
      setPhase("done");
    } catch (err) {
      alert("Upload failed: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setUploading(false);
    }
  }

  function handleScanAnother() {
    setPages([]);
    setCurrentCapture(null);
    setResultId(null);
    setPhase("camera");
  }

  // ── Camera ──
  if (phase === "camera") {
    return (
      <CameraViewfinder
        onCapture={handleCapture}
        onClose={() => {
          if (pages.length > 0) {
            setPhase("review");
          }
          // If no pages captured, there's nowhere to go back to
        }}
      />
    );
  }

  // ── Preview ──
  if (phase === "preview" && currentCapture) {
    return (
      <CapturePreview
        blob={currentCapture}
        onRetake={handleRetake}
        onAccept={handleAcceptPhoto}
      />
    );
  }

  // ── Quick review ──
  if (phase === "review") {
    return (
      <div className="min-h-screen bg-zinc-950">
        {/* Add more photos button */}
        <div className="flex items-center justify-between px-4 pt-4">
          <button
            onClick={handleAddMore}
            className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs text-white/60 hover:bg-white/5"
          >
            <Camera className="size-3.5" /> Add page
          </button>
          <span className="text-xs text-white/40">
            {pages.length} page{pages.length !== 1 ? "s" : ""}
          </span>
        </div>
        <QuickReview
          pageCount={pages.length}
          onSubmit={handleSubmit}
          uploading={uploading}
        />
      </div>
    );
  }

  // ── Done ──
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center">
      <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-green-500/20">
        <CheckCircle className="size-10 text-green-400" />
      </div>
      <h1 className="text-2xl font-bold text-white">Uploaded!</h1>
      <p className="mt-2 text-sm text-white/50">
        {pages.length} page{pages.length !== 1 ? "s" : ""} sent to the review queue.
      </p>

      <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={handleScanAnother}
          className="flex items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-semibold text-black"
        >
          <Camera className="size-4" /> Scan Another
        </button>
        <a
          href="/admin/invoices"
          className="flex items-center justify-center gap-2 rounded-xl border border-white/20 py-3.5 text-sm font-medium text-white/70 hover:bg-white/5"
        >
          <ClipboardList className="size-4" /> View Queue
        </a>
      </div>
    </div>
  );
}
