"use client";

import { useMemo, useState } from "react";
import { MapPin, Phone } from "lucide-react";
import { useBulkOrderStore } from "@/stores/bulk-order-store";

const ACCESS_OPTIONS = [
  { key: "lowWires", label: "Low wires / branches" },
  { key: "narrowDriveway", label: "Narrow driveway" },
  { key: "softGround", label: "Soft ground / lawn" },
  { key: "gated", label: "Gated / access code" },
  { key: "steep", label: "Steep driveway" },
];

function getNextDeliveryDays(count: number): Array<{ label: string; value: string; isToday: boolean }> {
  const days: Array<{ label: string; value: string; isToday: boolean }> = [];
  const now = new Date();
  const cutoffHour = 11;
  let d = new Date(now);

  for (let i = 0; days.length < count; i++) {
    if (i > 0) d.setDate(d.getDate() + 1);
    if (d.getDay() === 0) continue; // Skip Sundays
    const isToday = i === 0;
    const pastCutoff = isToday && now.getHours() >= cutoffHour;
    if (isToday && pastCutoff) continue;

    days.push({
      label: isToday ? "Today ⚡" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      value: d.toISOString().split("T")[0],
      isToday,
    });
  }
  return days;
}

/**
 * Delivery form: address, date, instructions, phone, access constraints.
 * Spec §9.3, §9.4
 */
export function DeliveryForm() {
  const store = useBulkOrderStore();
  const deliveryDays = useMemo(() => getNextDeliveryDays(7), []);

  return (
    <div data-testid="delivery-form" className="space-y-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-bulk-faded">
        🚛 Delivery Details
      </p>

      {/* Address */}
      <div>
        <label className="mb-1 block text-xs font-medium text-bulk-muted">Delivery Address</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 size-4 text-bulk-faded" />
          <input
            type="text"
            value={store.deliveryAddress}
            onChange={(e) => store.setDeliveryDetails({ deliveryAddress: e.target.value })}
            placeholder="Enter delivery address"
            className="w-full rounded-xl border border-bulk-border bg-white py-3 pl-10 pr-4 text-sm text-bulk-text placeholder:text-bulk-faded focus:border-bulk-sage focus:outline-none focus:ring-1 focus:ring-bulk-sage"
          />
        </div>
      </div>

      {/* Date picker */}
      <div>
        <label className="mb-1 block text-xs font-medium text-bulk-muted">Delivery Date</label>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {deliveryDays.map((day) => (
            <button
              key={day.value}
              onClick={() => store.setDeliveryDetails({ deliveryDate: day.value })}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors ${
                store.deliveryDate === day.value
                  ? "bg-bulk-primary text-white"
                  : day.isToday
                  ? "border border-amber-300 bg-amber-50 text-amber-800"
                  : "border border-bulk-border bg-white text-bulk-muted hover:border-bulk-sage"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div>
        <label className="mb-1 block text-xs font-medium text-bulk-muted">
          Where should we dump it?
        </label>
        <textarea
          value={store.instructions}
          onChange={(e) => store.setDeliveryDetails({ instructions: e.target.value })}
          placeholder="Left side of driveway, behind the fence..."
          rows={2}
          className="w-full resize-none rounded-xl border border-bulk-border bg-white p-3 text-sm text-bulk-text placeholder:text-bulk-faded focus:border-bulk-sage focus:outline-none focus:ring-1 focus:ring-bulk-sage"
        />
      </div>

      {/* Phone */}
      <div>
        <label className="mb-1 block text-xs font-medium text-bulk-muted">
          Phone — we&apos;ll text when we&apos;re on the way
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-3 size-4 text-bulk-faded" />
          <input
            type="tel"
            value={store.phone}
            onChange={(e) => store.setDeliveryDetails({ phone: e.target.value })}
            placeholder="(631) ___-____"
            className="w-full rounded-xl border border-bulk-border bg-white py-3 pl-10 pr-4 text-sm text-bulk-text placeholder:text-bulk-faded focus:border-bulk-sage focus:outline-none focus:ring-1 focus:ring-bulk-sage"
          />
        </div>
      </div>

      {/* Access constraints */}
      <div>
        <label className="mb-2 block text-xs font-medium text-bulk-muted">Access Warnings</label>
        <div className="grid grid-cols-2 gap-2">
          {ACCESS_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => {
                const current = store.accessConstraints[opt.key] ?? false;
                store.setDeliveryDetails({
                  accessConstraints: { ...store.accessConstraints, [opt.key]: !current },
                });
              }}
              className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs transition-colors ${
                store.accessConstraints[opt.key]
                  ? "border-bulk-warn-border bg-bulk-warn-bg text-bulk-warn-text"
                  : "border-bulk-border bg-white text-bulk-muted"
              }`}
            >
              <span className={`flex size-4 items-center justify-center rounded border ${
                store.accessConstraints[opt.key]
                  ? "border-bulk-warn-text bg-bulk-warn-text"
                  : "border-bulk-border"
              }`}>
                {store.accessConstraints[opt.key] && (
                  <svg className="size-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-bulk-faded">
          We may not be able to deliver to locations with low overhead clearance or soft ground.
        </p>
      </div>
    </div>
  );
}
