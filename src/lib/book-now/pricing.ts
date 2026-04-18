/**
 * Pricing calculation for Book-a-Crew services.
 * Shared between client (live preview) and server (authoritative validation).
 */

import type { InstantBookService, Quote, QuoteLineItem, TimelineOption } from "./types";
import { TIMELINE_CONFIG } from "./types";
import { getServiceSchema, type ServiceSchema } from "./schemas";

/** Compute the subtotal for a single service given the customer's inputs. */
export function priceService(
  service: InstantBookService,
  inputs: Record<string, string | number>,
): number {
  const schema = getServiceSchema(service.slug);
  if (!schema) return 0;

  const pricing = service.pricing || {};

  switch (schema.mode) {
    case "flat": {
      return pricing.flat_cents ?? pricing.base_cents ?? 0;
    }

    case "tiered": {
      // Find the tier-key input (first input with type "tier")
      const tierInput = schema.inputs.find((i) => i.type === "tier");
      if (!tierInput) return pricing.base_cents ?? 0;
      const selectedTier = String(inputs[tierInput.key] ?? tierInput.default);
      return pricing.tiers?.[selectedTier] ?? pricing.base_cents ?? 0;
    }

    case "per_unit": {
      const base = pricing.base_cents ?? 0;
      const perUnit = pricing.per_unit_cents ?? 0;
      if (!perUnit) return base;

      // Find the primary quantity input (first number input)
      const qtyInput = schema.inputs.find((i) => i.type === "number");
      const qty = qtyInput ? Number(inputs[qtyInput.key] ?? qtyInput.default) : 1;

      // Collect multiplier factors from all select inputs
      let factor = 1;
      for (const input of schema.inputs) {
        if (input.type !== "select") continue;
        const value = String(inputs[input.key] ?? input.default);
        const option = input.options.find((o) => o.value === value);
        if (option?.factor !== undefined) factor *= option.factor;
      }

      const raw = base + perUnit * qty * factor;
      const min = pricing.min_total_cents ?? 0;
      return Math.max(raw, min);
    }

    case "quote_only":
      return 0;
  }
}

/** Compute the full Quote given a list of (service, inputs) + timeline. */
export function buildQuote(params: {
  address: string;
  lotSize: Quote["property"]["lotSize"];
  timeline: TimelineOption;
  selections: Array<{ service: InstantBookService; inputs: Record<string, string | number> }>;
}): Quote {
  const items: QuoteLineItem[] = params.selections.map(({ service, inputs }) => ({
    serviceSlug: service.slug,
    serviceName: service.name,
    inputs,
    subtotalCents: priceService(service, inputs),
  }));

  const subtotalCents = items.reduce((sum, i) => sum + i.subtotalCents, 0);
  const multiplier = TIMELINE_CONFIG[params.timeline].multiplier;
  const adjusted = Math.round(subtotalCents * multiplier);

  return {
    property: { address: params.address, lotSize: params.lotSize },
    timeline: params.timeline,
    items,
    subtotalCents,
    timelineMultiplier: multiplier,
    adjustedSubtotalCents: adjusted,
    totalCents: adjusted,
  };
}

/** Format cents as USD string. */
export function formatUsd(cents: number, opts: { decimals?: boolean } = {}): string {
  const decimals = opts.decimals ?? false;
  const value = cents / 100;
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  })}`;
}
