// Spec: Section 6 — Touch 1: Soft post-add banner nudging complementary material
"use client";
export interface UpsellBannerProps {
  productName: string;
  complementSlug: string;
  complementName: string;
  onTap: () => void;
  onDismiss: () => void;
}
export function UpsellBanner(props: UpsellBannerProps) {
  // TODO: implement — amber banner, "Pair with X?", add button, dismiss
  return <div data-testid="upsell-banner">UpsellBanner</div>;
}
