// Spec: Section 7 — CC / Klarna / Afterpay radio cards (NO surcharge on /app)
"use client";
export interface PaymentSelectorProps {
  selected: "card" | "klarna" | "afterpay";
  totalCents: number;
  onChange: (method: "card" | "klarna" | "afterpay") => void;
}
export function PaymentSelector(props: PaymentSelectorProps) {
  // TODO: implement — 3 card-style radio options, Klarna/Afterpay show installment amounts
  return <div data-testid="payment-selector">PaymentSelector</div>;
}
