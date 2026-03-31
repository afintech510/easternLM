// Spec: Section 5 — Multi-load breakdown with per-load fees and schedule
"use client";
export interface TruckSplitDisplayProps {
  loads: Array<{ truckName: string; quantity: number; feeCents: number; day: number }>;
  totalFeeCents: number;
}
export function TruckSplitDisplay(props: TruckSplitDisplayProps) {
  // TODO: implement — load table, per-load fees, warning card, delivery schedule
  return <div data-testid="truck-split-display">TruckSplitDisplay</div>;
}
