// Spec: Section 6 — Touch 2: Order summary upsell card (2nd delivery 50% off)
"use client";
export interface UpsellCardProps {
  deliveryFeeCents: number;
  discountedFeeCents: number;
  onBrowse: () => void;
  onDismiss: () => void;
}
export function UpsellCard(props: UpsellCardProps) {
  // TODO: implement — warm gradient card, "Save 50% on 2nd delivery", browse CTA
  return <div data-testid="upsell-card">UpsellCard</div>;
}
