/**
 * Analytics event layer for the /app bulk ordering experience.
 * Fires both Google gtag and Meta Pixel events.
 *
 * Spec Section 10: Remarketing via Google + Meta.
 * All functions are no-ops if the tracking scripts aren't loaded.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
  }
}

// ── Google gtag events ───────────────────────────────────────────

export function trackViewItem(product: { id: string; name: string; priceCents: number }) {
  // TODO: implement — gtag("event", "view_item", ...)
}

export function trackAddToOrder(item: { id: string; name: string; qty: number; valueCents: number }) {
  // TODO: implement — gtag("event", "add_to_cart", ...)
}

export function trackBeginCheckout(valueCents: number, items: Array<{ id: string; name: string; qty: number }>) {
  // TODO: implement — gtag("event", "begin_checkout", ...)
}

export function trackPurchase(orderId: string, valueCents: number, items: Array<{ id: string; name: string; qty: number }>) {
  // TODO: implement — gtag("event", "purchase", ...)
}

// ── Meta Pixel events ────────────────────────────────────────────

export function fbViewContent(product: { id: string; name: string; priceCents: number }) {
  // TODO: implement — fbq("track", "ViewContent", ...)
}

export function fbAddToCart(item: { id: string; name: string; qty: number; valueCents: number }) {
  // TODO: implement — fbq("track", "AddToCart", ...)
}

export function fbInitiateCheckout(valueCents: number) {
  // TODO: implement — fbq("track", "InitiateCheckout", ...)
}

export function fbPurchase(orderId: string, valueCents: number) {
  // TODO: implement — fbq("track", "Purchase", ...)
}
