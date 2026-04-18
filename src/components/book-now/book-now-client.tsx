"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, ChevronDown, Loader2, Plus, ShoppingCart, Sparkles, Truck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CartItem, InstantBookService, ServicePackage } from "@/lib/book-now/types";

const CATEGORIES = [
  { key: "all", label: "All Services" },
  { key: "install", label: "Mulch & Install" },
  { key: "cleanup", label: "Cleanup" },
  { key: "washing", label: "Washing" },
];

function formatUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function priceLabel(pkg: ServicePackage): string {
  if (pkg.unit === "quote") return "Get quote";
  if (pkg.unit === "per_unit") return `${formatUsd(pkg.price_cents)} per unit`;
  return formatUsd(pkg.price_cents);
}

export function BookNowClient({ initialServices }: { initialServices: InstantBookService[] }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [category, setCategory] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);

  const filteredServices = useMemo(() => {
    if (category === "all") return initialServices;
    return initialServices.filter((s) => s.category === category);
  }, [initialServices, category]);

  const cartTotal = useMemo(() => cart.reduce((sum, i) => sum + i.lineTotalCents, 0), [cart]);

  function addToCart(service: InstantBookService, pkg: ServicePackage, qty = 1) {
    if (pkg.unit === "quote") {
      setShowCustom(true);
      return;
    }
    setCart((prev) => {
      const existing = prev.findIndex((i) => i.serviceId === service.id && i.packageName === pkg.name);
      if (existing !== -1) {
        const copy = [...prev];
        copy[existing] = {
          ...copy[existing],
          quantity: copy[existing].quantity + qty,
          lineTotalCents: (copy[existing].quantity + qty) * pkg.price_cents,
        };
        return copy;
      }
      return [
        ...prev,
        {
          serviceId: service.id,
          serviceSlug: service.slug,
          serviceName: service.name,
          packageName: pkg.name,
          packageUnit: pkg.unit,
          quantity: qty,
          priceCents: pkg.price_cents,
          lineTotalCents: pkg.price_cents * qty,
        },
      ];
    });
  }

  function removeFromCart(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  function goToCheckout() {
    if (cart.length === 0) return;
    // Persist cart to session storage for the checkout page
    if (typeof window !== "undefined") {
      sessionStorage.setItem("elm_book_now_cart", JSON.stringify(cart));
    }
    window.location.href = "/services/book-now/checkout";
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="topo-pattern absolute inset-0 opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/20 px-4 py-1.5 text-sm font-semibold text-accent">
              <Truck className="size-4" /> Suffolk County · Online Booking Platform
            </div>
            <h1 className="[font-family:var(--font-display)] text-4xl md:text-5xl">
              Order a Gardener. Book a Crew. Online in 60 Seconds.
            </h1>
            <p className="mt-4 text-lg text-primary-foreground/80">
              We're the booking platform for basic landscape services in Suffolk County. Pick what you need — we match you with a vetted local crew (or dispatch our own). <strong>Card authorization only</strong>; you pay the crew directly in cash.
            </p>
            <div className="mt-6 flex flex-wrap gap-6 text-sm text-primary-foreground/70">
              <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-accent" /> Vetted, insured local crews</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-accent" /> Transparent platform pricing</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-accent" /> Cancel before confirm — no fees</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b bg-warm-bg">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "1", t: "Pick services", d: "Multi-select from the menu below or request a custom project." },
              { n: "2", t: "Card authorized", d: "Commitment only — card held, not charged. You confirm date, time, and sign our terms." },
              { n: "3", t: "Platform fee captured", d: "We charge a small platform fee, release the rest, and introduce you to your Provider." },
              { n: "4", t: "Pay crew in cash", d: "50% before service · 50% after completion, paid directly to the Provider." },
            ].map((step) => (
              <div key={step.n} className="flex gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                  {step.n}
                </div>
                <div>
                  <p className="font-semibold">{step.t}</p>
                  <p className="text-sm text-muted-foreground">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid lg:grid-cols-[1fr_380px]">
        {/* Main — services grid */}
        <div>
          {/* Category filter */}
          <div className="mb-6 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  category === c.key
                    ? "bg-primary text-primary-foreground"
                    : "border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Service grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {filteredServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                expanded={expandedId === service.id}
                onToggle={() => setExpandedId(expandedId === service.id ? null : service.id)}
                onAdd={(pkg) => addToCart(service, pkg)}
                cart={cart}
              />
            ))}
          </div>

          {filteredServices.length === 0 && (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
              No services in this category right now. Check back soon.
            </div>
          )}

          {/* Custom project CTA */}
          <div className="mt-10 rounded-2xl border-2 border-accent/20 bg-accent/5 p-6 md:p-8">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Larger or custom project?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Patios over 500 sq ft, driveway rebuilds, multi-day installs — tell us what you're planning and we'll send a custom quote.
                </p>
              </div>
              <Button onClick={() => setShowCustom(true)} size="lg" className="shrink-0">
                Tell Us More <Sparkles className="ml-1 size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar cart — desktop */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <CartPanel cart={cart} total={cartTotal} onRemove={removeFromCart} onCheckout={goToCheckout} />
          </div>
        </aside>
      </div>

      {/* Mobile cart — sticky bottom */}
      {cart.length > 0 && (
        <div className="sticky bottom-0 z-40 border-t bg-background p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] lg:hidden">
          <Button onClick={goToCheckout} size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            <ShoppingCart className="size-4" /> Review {cart.length} service{cart.length > 1 ? "s" : ""} — {formatUsd(cartTotal)}
          </Button>
        </div>
      )}

      {showCustom && <CustomProjectModal onClose={() => setShowCustom(false)} />}
    </div>
  );
}

function ServiceCard({
  service,
  expanded,
  onToggle,
  onAdd,
  cart,
}: {
  service: InstantBookService;
  expanded: boolean;
  onToggle: () => void;
  onAdd: (pkg: ServicePackage) => void;
  cart: CartItem[];
}) {
  const packages = service.packages || [];
  const minPrice = packages.filter((p) => p.unit !== "quote").reduce((min, p) => Math.min(min, p.price_cents), Infinity);
  const hasQuoteOnly = packages.every((p) => p.unit === "quote");

  const inCartCount = cart.filter((c) => c.serviceId === service.id).length;

  return (
    <article className={`rounded-xl border bg-card transition-all ${expanded ? "shadow-md ring-2 ring-accent/20" : "hover:border-accent/30"}`}>
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 p-5 text-left">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Truck className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">{service.name}</h3>
              {service.tagline && <p className="mt-0.5 text-xs text-muted-foreground">{service.tagline}</p>}
            </div>
            <ChevronDown className={`size-5 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
          </div>
          <div className="mt-2 flex items-center gap-2">
            {hasQuoteOnly ? (
              <span className="text-sm font-semibold text-accent">Custom quote</span>
            ) : (
              <span className="text-sm font-semibold text-foreground">
                From {formatUsd(minPrice)}
              </span>
            )}
            {inCartCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                <Check className="size-3" /> {inCartCount} in cart
              </span>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="space-y-4 border-t px-5 pb-5 pt-4">
          {service.description && <p className="text-sm text-muted-foreground">{service.description}</p>}

          {service.includes && service.includes.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">What's included</p>
              <ul className="grid gap-1 sm:grid-cols-2">
                {service.includes.map((inc) => (
                  <li key={inc} className="flex items-start gap-1.5 text-sm">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-accent" /> <span>{inc}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select a package</p>
            {packages.map((pkg) => (
              <div key={pkg.name} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{pkg.name}</p>
                  {pkg.description && <p className="text-xs text-muted-foreground">{pkg.description}</p>}
                </div>
                <div className="text-right">
                  <p className="font-semibold">{priceLabel(pkg)}</p>
                </div>
                <Button
                  size="sm"
                  variant={pkg.unit === "quote" ? "outline" : "default"}
                  onClick={() => onAdd(pkg)}
                >
                  {pkg.unit === "quote" ? "Get Quote" : <><Plus className="size-3.5" /> Add</>}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function CartPanel({
  cart,
  total,
  onRemove,
  onCheckout,
}: {
  cart: CartItem[];
  total: number;
  onRemove: (index: number) => void;
  onCheckout: () => void;
}) {
  if (cart.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <ShoppingCart className="mx-auto size-8 text-muted-foreground/40" />
        <p className="mt-3 font-semibold">Your booking is empty</p>
        <p className="mt-1 text-sm text-muted-foreground">Pick services from the menu to start.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Your Booking ({cart.length})</h2>
        <span className="text-sm font-semibold">{formatUsd(total)}</span>
      </div>
      <div className="space-y-2">
        {cart.map((item, i) => (
          <div key={`${item.serviceId}-${item.packageName}-${i}`} className="flex items-start gap-2 rounded-lg border p-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{item.serviceName}</p>
              <p className="text-xs text-muted-foreground">
                {item.packageName}{item.quantity > 1 ? ` × ${item.quantity}` : ""}
              </p>
            </div>
            <span className="font-semibold">{formatUsd(item.lineTotalCents)}</span>
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Remove"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2 border-t pt-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatUsd(total)}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>+ 3% processing on final charge</span>
          <span>calculated at checkout</span>
        </div>
      </div>
      <Button onClick={onCheckout} size="lg" className="mt-4 w-full bg-accent text-accent-foreground hover:bg-accent/90">
        Continue to Booking →
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Card authorization only — no charge until we confirm
      </p>
    </div>
  );
}

function CustomProjectModal({ onClose }: { onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    projectDescription: "",
    budget: "",
    timeline: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/services/book-now/custom-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Submit failed");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto size-12 text-green-600" />
            <h2 className="text-xl font-bold">Thanks — we got it.</h2>
            <p className="text-sm text-muted-foreground">
              We'll call or text you within 24 hours with a custom quote.
            </p>
            <Button onClick={onClose} className="w-full">Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">Tell us about your project</h2>
                <p className="mt-1 text-sm text-muted-foreground">We'll respond within 24 hours with a custom quote.</p>
              </div>
              <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Phone *</label>
                <input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-md border px-3 py-2 text-sm" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-md border px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Property Address</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Street, City, NY ZIP"
                className="w-full rounded-md border px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Describe your project *</label>
              <textarea required rows={5} value={form.projectDescription} onChange={(e) => setForm({ ...form, projectDescription: e.target.value })}
                placeholder="What are you thinking? Size, materials, timing, any photos you can share..."
                className="w-full rounded-md border px-3 py-2 text-sm" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Budget (optional)</label>
                <input value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  placeholder="e.g. $5–10k"
                  className="w-full rounded-md border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Timeline (optional)</label>
                <input value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })}
                  placeholder="e.g. next month"
                  className="w-full rounded-md border px-3 py-2 text-sm" />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={submitting} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                {submitting ? <><Loader2 className="size-4 animate-spin" /> Sending...</> : <>Send Request</>}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
