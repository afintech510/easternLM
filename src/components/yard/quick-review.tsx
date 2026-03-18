"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Receipt,
  Truck,
  FileQuestion,
  ChevronRight,
  SkipForward,
  Upload,
  Loader2,
  Building2,
} from "lucide-react";

export interface ScanMeta {
  documentType: string;
  companyName: string;
  documentNumber: string;
  address: string;
  productName: string;
  quantity: string;
  cost: string;
  supplierId: string;
  notes: string;
}

const EMPTY_META: ScanMeta = {
  documentType: "invoice",
  companyName: "",
  documentNumber: "",
  address: "",
  productName: "",
  quantity: "",
  cost: "",
  supplierId: "",
  notes: "",
};

interface Supplier {
  id: string;
  name: string;
}

const DOC_TYPES = [
  { value: "invoice", label: "Invoice", icon: FileText },
  { value: "receipt", label: "Receipt", icon: Receipt },
  { value: "delivery_ticket", label: "Delivery Ticket", icon: Truck },
  { value: "other", label: "Other", icon: FileQuestion },
];

const STEPS = [
  { key: "documentType", label: "Document Type", required: true },
  { key: "companyName", label: "Company Name", required: false, placeholder: "e.g. Suffolk Aggregate" },
  { key: "documentNumber", label: "Document #", required: false, placeholder: "Invoice or receipt number" },
  { key: "address", label: "Address", required: false, placeholder: "Supplier address (optional)" },
  { key: "productName", label: "Product / Service", required: false, placeholder: "Main item on this document" },
  { key: "qtyCost", label: "Qty & Cost", required: false },
  { key: "supplierId", label: "Supplier", required: false },
] as const;

interface Props {
  pageCount: number;
  onSubmit: (meta: ScanMeta) => void;
  uploading: boolean;
}

export function QuickReview({ pageCount, onSubmit, uploading }: Props) {
  const [step, setStep] = useState(0);
  const [meta, setMeta] = useState<ScanMeta>(EMPTY_META);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch suppliers when we reach that step
  useEffect(() => {
    if (STEPS[step]?.key === "supplierId" && suppliers.length === 0) {
      setLoadingSuppliers(true);
      fetch("/api/admin/suppliers")
        .then((r) => r.json())
        .then((d) => setSuppliers(d.suppliers ?? []))
        .finally(() => setLoadingSuppliers(false));
    }
  }, [step, suppliers.length]);

  // Auto-focus text inputs
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 150);
  }, [step]);

  function advance() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  }

  function handleAccept() {
    advance();
  }

  function handleSkip() {
    advance();
  }

  const isLastStep = step === STEPS.length - 1;
  const currentStep = STEPS[step];

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-white">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 px-4 pt-6 pb-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === step ? "w-8 bg-white" : i < step ? "w-4 bg-white/40" : "w-4 bg-white/15"
            }`}
          />
        ))}
      </div>

      <p className="text-center text-xs text-white/40 mb-2">
        {pageCount} page{pageCount !== 1 ? "s" : ""} captured
      </p>

      {/* Step content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <p className="mb-6 text-lg font-medium text-white/70">{currentStep.label}</p>

        {/* Step 1: Document type pills */}
        {currentStep.key === "documentType" && (
          <div className="grid w-full max-w-sm grid-cols-2 gap-3">
            {DOC_TYPES.map((dt) => (
              <button
                key={dt.value}
                onClick={() => {
                  setMeta((m) => ({ ...m, documentType: dt.value }));
                  advance();
                }}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-5 transition-colors ${
                  meta.documentType === dt.value
                    ? "border-white bg-white/10"
                    : "border-white/15 bg-white/5 hover:border-white/30"
                }`}
              >
                <dt.icon className="size-7 text-white/80" />
                <span className="text-sm font-medium">{dt.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 2-5: Text inputs */}
        {(currentStep.key === "companyName" ||
          currentStep.key === "documentNumber" ||
          currentStep.key === "address" ||
          currentStep.key === "productName") && (
          <div className="w-full max-w-sm space-y-4">
            <input
              ref={inputRef}
              type="text"
              value={meta[currentStep.key]}
              onChange={(e) => setMeta((m) => ({ ...m, [currentStep.key]: e.target.value }))}
              placeholder={(currentStep as any).placeholder ?? ""}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-4 text-lg text-white placeholder:text-white/30 focus:border-white/50 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAccept();
              }}
            />
            <div className="flex gap-3">
              {!currentStep.required && (
                <button
                  onClick={handleSkip}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 py-3 text-sm text-white/50 hover:bg-white/5"
                >
                  <SkipForward className="size-3.5" /> Skip
                </button>
              )}
              <button
                onClick={handleAccept}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-3 text-sm font-semibold text-black hover:bg-white/90"
              >
                Accept <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Qty & Cost side by side */}
        {currentStep.key === "qtyCost" && (
          <div className="w-full max-w-sm space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-white/40">Quantity</label>
                <input
                  ref={inputRef}
                  type="number"
                  inputMode="decimal"
                  value={meta.quantity}
                  onChange={(e) => setMeta((m) => ({ ...m, quantity: e.target.value }))}
                  placeholder="e.g. 10"
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-4 text-lg text-white placeholder:text-white/30 focus:border-white/50 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/40">Cost ($)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={meta.cost}
                  onChange={(e) => setMeta((m) => ({ ...m, cost: e.target.value }))}
                  placeholder="e.g. 350.00"
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-4 text-lg text-white placeholder:text-white/30 focus:border-white/50 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 py-3 text-sm text-white/50 hover:bg-white/5"
              >
                <SkipForward className="size-3.5" /> Skip
              </button>
              <button
                onClick={handleAccept}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-3 text-sm font-semibold text-black hover:bg-white/90"
              >
                Accept <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 7: Supplier dropdown */}
        {currentStep.key === "supplierId" && (
          <div className="w-full max-w-sm space-y-4">
            {loadingSuppliers ? (
              <div className="flex items-center justify-center gap-2 py-8 text-white/50">
                <Loader2 className="size-5 animate-spin" /> Loading suppliers…
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMeta((m) => ({ ...m, supplierId: "" }));
                    // Don't advance — user will hit Upload
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
                    !meta.supplierId ? "border-white bg-white/10" : "border-white/15 hover:border-white/30"
                  }`}
                >
                  <Building2 className="size-5 text-white/50" />
                  <span className="text-sm">Assign later</span>
                </button>
                {suppliers.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setMeta((m) => ({ ...m, supplierId: s.id }))}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
                      meta.supplierId === s.id ? "border-white bg-white/10" : "border-white/15 hover:border-white/30"
                    }`}
                  >
                    <Building2 className="size-5 text-white/50" />
                    <span className="text-sm">{s.name}</span>
                  </button>
                ))}
              </>
            )}

            {/* Summary + Upload button */}
            <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm space-y-1">
              <p className="font-medium text-white/70 mb-2">Summary</p>
              {meta.documentType && (
                <p className="text-white/50">
                  Type: <span className="text-white">{DOC_TYPES.find((d) => d.value === meta.documentType)?.label}</span>
                </p>
              )}
              {meta.companyName && (
                <p className="text-white/50">
                  Company: <span className="text-white">{meta.companyName}</span>
                </p>
              )}
              {meta.documentNumber && (
                <p className="text-white/50">
                  Doc #: <span className="text-white">{meta.documentNumber}</span>
                </p>
              )}
              {meta.productName && (
                <p className="text-white/50">
                  Product: <span className="text-white">{meta.productName}</span>
                </p>
              )}
              {(meta.quantity || meta.cost) && (
                <p className="text-white/50">
                  {meta.quantity && <>Qty: <span className="text-white">{meta.quantity}</span> </>}
                  {meta.cost && <>Cost: <span className="text-white">${meta.cost}</span></>}
                </p>
              )}
            </div>

            <button
              onClick={() => onSubmit(meta)}
              disabled={uploading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-4 text-base font-semibold text-white hover:bg-green-400 disabled:opacity-50"
            >
              {uploading ? (
                <><Loader2 className="size-5 animate-spin" /> Uploading…</>
              ) : (
                <><Upload className="size-5" /> Upload {pageCount} Page{pageCount !== 1 ? "s" : ""}</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
