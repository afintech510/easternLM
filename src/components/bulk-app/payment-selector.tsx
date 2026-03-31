"use client";

import { formatUsd } from "@/lib/format";

type PaymentMethod = "card" | "klarna" | "afterpay";

export interface PaymentSelectorProps {
  selected: PaymentMethod;
  totalCents: number;
  onChange: (method: PaymentMethod) => void;
}

const OPTIONS: Array<{
  key: PaymentMethod;
  label: string;
  sublabel: (totalCents: number) => string;
  icon: string;
}> = [
  {
    key: "card",
    label: "Credit or Debit Card",
    sublabel: () => "No extra fees",
    icon: "💳",
  },
  {
    key: "klarna",
    label: "Klarna — Pay in 4",
    sublabel: (t) => `4 interest-free payments of ${formatUsd(Math.ceil(t / 4))}`,
    icon: "K",
  },
  {
    key: "afterpay",
    label: "Afterpay — Pay in 4",
    sublabel: () => "Split into 4 payments",
    icon: "A",
  },
];

/**
 * Payment method radio cards. NO surcharge on any option.
 * Spec §7
 */
export function PaymentSelector({
  selected,
  totalCents,
  onChange,
}: PaymentSelectorProps) {
  return (
    <div data-testid="payment-selector" className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-bulk-faded">
        Payment Method
      </p>
      {OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`flex w-full items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-colors ${
            selected === opt.key
              ? "border-bulk-primary bg-green-50"
              : "border-bulk-border bg-white hover:border-bulk-sage"
          }`}
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-bulk-card text-lg font-bold text-bulk-primary">
            {opt.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-bulk-text">{opt.label}</p>
            <p className="text-[11px] text-bulk-sage">{opt.sublabel(totalCents)}</p>
          </div>
          <div
            className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
              selected === opt.key
                ? "border-bulk-primary bg-bulk-primary"
                : "border-bulk-border"
            }`}
          >
            {selected === opt.key && (
              <div className="size-2 rounded-full bg-white" />
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
