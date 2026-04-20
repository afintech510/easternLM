/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
  }
}

function gtag(...args: any[]) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag(...args);
  }
}

export function trackViewItem(product: { id: string; name: string; priceCents: number }) {
  gtag("event", "view_item", {
    currency: "USD",
    value: product.priceCents / 100,
    items: [{ item_id: product.id, item_name: product.name, price: product.priceCents / 100 }],
  });
}

export function trackAddToOrder(item: { id: string; name: string; qty: number; valueCents: number }) {
  gtag("event", "add_to_cart", {
    currency: "USD",
    value: item.valueCents / 100,
    items: [{ item_id: item.id, item_name: item.name, quantity: item.qty, price: item.valueCents / item.qty / 100 }],
  });
}

export function trackBeginCheckout(valueCents: number, items: Array<{ id: string; name: string; qty: number }>) {
  gtag("event", "begin_checkout", {
    currency: "USD",
    value: valueCents / 100,
    items: items.map((i) => ({ item_id: i.id, item_name: i.name, quantity: i.qty })),
  });
}

export function trackPurchase(orderId: string, valueCents: number, items: Array<{ id: string; name: string; qty: number }>) {
  gtag("event", "purchase", {
    transaction_id: orderId,
    currency: "USD",
    value: valueCents / 100,
    items: items.map((i) => ({ item_id: i.id, item_name: i.name, quantity: i.qty })),
  });
}

export function trackGenerateLead(formName: string) {
  gtag("event", "generate_lead", {
    currency: "USD",
    value: 0,
    event_label: formName,
  });
}
