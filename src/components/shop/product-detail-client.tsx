"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Calculator, Check, CheckCircle, MapPin, Phone, Truck } from "lucide-react";
import { toast } from "sonner";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductImage } from "@/components/ui/product-image";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { calculateDeliveryFees, type DeliveryPricingConfig, type TruckType } from "@/lib/delivery";
import type { ShopProduct } from "@/lib/data/catalog";
import { useCartStore } from "@/stores/cartStore";

type DistancePreview = {
  firstLoadFeeCents: number;
  additionalLoadFeeCents: number;
  durationSeconds: number;
  oneWayMiles: number;
  fromCache: boolean;
};

type ProductDetailClientProps = {
  product: ShopProduct;
  relatedProducts: ShopProduct[];
};

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(cents / 100);
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

function clampQuantity(value: number, min: number, max: number, step: number) {
  const clamped = Math.max(min, Math.min(max, value));
  const offset = clamped - min;
  const steps = Math.round(offset / step);
  const snapped = min + steps * step;
  const precision = step % 1 === 0 ? 0 : 2;
  return Number(snapped.toFixed(precision));
}

export function ProductDetailClient({ product, relatedProducts }: ProductDetailClientProps) {
  const addItem = useCartStore((state) => state.addItem);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(product.minQty);
  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup">("delivery");
  const [address, setAddress] = useState("");
  const [distancePreview, setDistancePreview] = useState<DistancePreview | null>(null);
  const [deliveryConfig, setDeliveryConfig] = useState<{ pricingConfig: DeliveryPricingConfig; truckTypes: TruckType[] } | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [isCheckingDelivery, setIsCheckingDelivery] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [yardLength, setYardLength] = useState("20");
  const [yardWidth, setYardWidth] = useState("10");
  const [yardDepth, setYardDepth] = useState("3");

  useEffect(() => {
    fetch("/api/delivery/config", { cache: "no-store" })
      .then(async (r) => { if (!r.ok) throw new Error(); return r.json() as Promise<{ pricingConfig: DeliveryPricingConfig; truckTypes: TruckType[] }>; })
      .then(setDeliveryConfig)
      .catch(() => setDeliveryError("Unable to load delivery configuration."));
  }, []);

  const yardsEstimate = useMemo(() => {
    const l = Number(yardLength), w = Number(yardWidth), d = Number(yardDepth);
    if (!Number.isFinite(l) || !Number.isFinite(w) || !Number.isFinite(d)) return 0;
    return (l * w * (d / 12)) / 27;
  }, [yardDepth, yardLength, yardWidth]);

  const deliveryCalculation = useMemo(() => {
    if (!distancePreview || !deliveryConfig) return null;
    return calculateDeliveryFees({
      cartItems: [{ id: product.id, name: product.name, quantity, unitPriceCents: product.pricePerUnitCents, deliveryType: product.deliveryType, materialClass: product.materialClass, fulfillmentMethod: deliveryMethod }],
      distanceResult: deliveryMethod === "delivery" ? { distanceMeters: distancePreview.oneWayMiles * 1609.344, durationSeconds: distancePreview.durationSeconds } : null,
      pricingConfig: deliveryConfig.pricingConfig, truckTypes: deliveryConfig.truckTypes, combineLoads: false, deliveryMethod,
    });
  }, [deliveryConfig, deliveryMethod, distancePreview, product, quantity]);

  const imageList = product.images.length > 0 ? product.images : ["https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200&h=800&fit=crop"];
  const isBulk = product.deliveryType === "bulk";
  const lineTotal = Math.round(quantity * product.pricePerUnitCents);

  async function handleCheckDelivery() {
    setIsCheckingDelivery(true);
    setDeliveryError(null);
    try {
      const res = await fetch("/api/delivery/distance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address }) });
      const payload = await res.json() as DistancePreview | { error: string };
      if (!res.ok || "error" in payload) throw new Error("error" in payload ? payload.error : "Failed.");
      setDistancePreview(payload);
    } catch (err) {
      setDistancePreview(null);
      setDeliveryError(err instanceof Error ? err.message : "Unable to calculate delivery.");
    } finally {
      setIsCheckingDelivery(false);
    }
  }

  const [justAdded, setJustAdded] = useState(false);

  async function handleAddToCart() {
    setIsAdding(true);
    await addItem({ id: product.id, name: product.name, quantity, unitPriceCents: product.pricePerUnitCents, deliveryType: product.deliveryType, materialClass: product.materialClass, fulfillmentMethod: deliveryMethod });
    setIsAdding(false);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);

    toast.success(`${product.name} added to cart`, {
      description: `${quantity} × ${formatUsd(product.pricePerUnitCents)} = ${formatUsd(lineTotal)}`,
      action: { label: "View Cart", onClick: () => { window.location.href = "/cart"; } },
      duration: 3000,
    });
  }

  return (
    <div className="space-y-10">

      {/* ── Main: Image + Purchase Info ──────────────────── */}
      <section className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        {/* Image gallery */}
        <div className="space-y-3">
          <ProductImage
            src={imageList[activeImageIndex] ?? imageList[0]}
            alt={product.name}
            className="h-[360px] w-full rounded-xl border object-cover md:h-[460px]"
            width={1200}
            height={800}
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
          />
          {imageList.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {imageList.slice(0, 4).map((image, i) => (
                <button
                  key={`${image}-${i}`}
                  type="button"
                  className={`overflow-hidden rounded-lg border ${i === activeImageIndex ? "ring-2 ring-accent" : ""}`}
                  onClick={() => setActiveImageIndex(i)}
                >
                  <ProductImage src={image} alt={`${product.name} ${i + 1}`} className="h-20 w-full object-cover" width={400} height={200} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Purchase column */}
        <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{product.categoryName}</p>
          <h1 className="[font-family:var(--font-display)] text-3xl text-primary md:text-4xl">{product.name}</h1>

          {/* Price — big and clear */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-accent">{formatUsd(product.pricePerUnitCents)}</span>
            <span className="text-base text-muted-foreground">{product.unitDisplay}</span>
            <span className="flex items-center gap-1 text-sm font-medium text-green-600">
              <CheckCircle className="size-4" /> In Stock
            </span>
          </div>
          {product.priceNote && <p className="text-sm text-muted-foreground">{product.priceNote}</p>}

          {/* Description */}
          <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>

          {/* Recommended uses */}
          {product.recommendedUses.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.recommendedUses.map((use) => (
                <span key={use} className="rounded-md border bg-muted/50 px-2.5 py-1 text-xs font-medium">{use}</span>
              ))}
            </div>
          )}

          {/* ── Quantity ─────────────────────────────────── */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Quantity</h2>
              <span className="text-sm font-semibold text-accent">= {formatUsd(lineTotal)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="size-9" onClick={() => setQuantity((c) => clampQuantity(c - product.stepQty, product.minQty, product.maxQty, product.stepQty))}>-</Button>
              <Input
                value={String(quantity)}
                onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n)) setQuantity(clampQuantity(n, product.minQty, product.maxQty, product.stepQty)); }}
                inputMode="decimal"
                className="w-20 text-center text-lg font-semibold"
              />
              <Button variant="outline" size="sm" className="size-9" onClick={() => setQuantity((c) => clampQuantity(c + product.stepQty, product.minQty, product.maxQty, product.stepQty))}>+</Button>
              <span className="text-xs text-muted-foreground">min {product.minQty} / max {product.maxQty}</span>
            </div>
          </div>

          {/* ── Delivery / Pickup ────────────────────────── */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <h2 className="text-sm font-semibold">Delivery or Pickup</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDeliveryMethod("delivery")}
                className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors ${deliveryMethod === "delivery" ? "border-accent bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted"}`}
              >
                <Truck className="size-4" /> Delivery
              </button>
              <button
                onClick={() => setDeliveryMethod("pickup")}
                className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors ${deliveryMethod === "pickup" ? "border-accent bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted"}`}
              >
                <MapPin className="size-4" /> Pickup
              </button>
            </div>

            {deliveryMethod === "delivery" ? (
              <div className="space-y-2">
                <AddressAutocomplete placeholder="Enter delivery address" value={address} onChange={setAddress} />
                <Button size="sm" disabled={isCheckingDelivery || address.trim().length < 8} onClick={handleCheckDelivery} className="w-full">
                  {isCheckingDelivery ? "Checking..." : "Check Delivery Fee"}
                </Button>
                {deliveryCalculation && (
                  <div className="rounded-lg border bg-background p-3 text-sm space-y-1">
                    <p className="font-semibold">Delivery: {formatUsd(deliveryCalculation.firstLoadFeeCents)} per load</p>
                    <p className="text-xs text-muted-foreground">{distancePreview?.oneWayMiles.toFixed(1)} mi / {formatDuration(distancePreview?.durationSeconds ?? 0)} one-way</p>
                    <p className="text-xs text-muted-foreground">{deliveryCalculation.totalLoads} load{deliveryCalculation.totalLoads > 1 ? "s" : ""}, {deliveryCalculation.totalDeliveryDays} delivery day{deliveryCalculation.totalDeliveryDays > 1 ? "s" : ""}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">110 Frowein Road, Center Moriches, NY 11934 — Mon-Fri 7-5, Sat 7-3</p>
            )}
            {deliveryError && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{deliveryError}</p>}
          </div>

          {/* ── Add to Cart — big, impossible to miss ──── */}
          <Button onClick={handleAddToCart} disabled={isAdding || justAdded} size="lg" className={`w-full text-lg shadow-lg transition-colors ${justAdded ? "bg-green-600 text-white shadow-green-600/20 hover:bg-green-600" : "bg-accent text-accent-foreground shadow-accent/20 hover:bg-accent/90"}`}>
            {isAdding ? "Adding..." : justAdded ? <><Check className="size-5" /> Added to Cart</> : `Add to Cart — ${formatUsd(lineTotal)}`}
          </Button>

          {/* Phone fallback */}
          <a href="tel:+16318746244" className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-accent">
            <Phone className="size-4" /> Or call (631) 874-6244 to order by phone
          </a>
        </div>
      </section>

      {/* ── Yard Calculator (bulk only) ──────────────────── */}
      {isBulk && (
        <section className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <Calculator className="size-5 text-accent" />
            <h2 className="text-lg font-semibold">Yard Calculator</h2>
            <span className="text-xs text-muted-foreground">L x W x Depth ÷ 27 = cubic yards</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Length (ft)</label>
              <Input value={yardLength} onChange={(e) => setYardLength(e.target.value)} inputMode="decimal" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Width (ft)</label>
              <Input value={yardWidth} onChange={(e) => setYardWidth(e.target.value)} inputMode="decimal" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Depth (in)</label>
              <Input value={yardDepth} onChange={(e) => setYardDepth(e.target.value)} inputMode="decimal" />
            </div>
            <div className="flex flex-col justify-end">
              <p className="mb-1 text-center text-lg font-bold text-accent">{yardsEstimate.toFixed(2)} yd</p>
              <Button variant="outline" size="sm" onClick={() => setQuantity(clampQuantity(yardsEstimate, product.minQty, product.maxQty, product.stepQty))}>
                Use This Quantity
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ── Pairs Well With ────────────────────────────── */}
      {relatedProducts.length > 0 && (
        <section>
          <h2 className="mb-4 [font-family:var(--font-display)] text-2xl text-primary">Pairs Well With</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedProducts.map((related) => (
              <article key={related.id} className="rounded-xl border bg-card p-4">
                <Link href={`/shop/${related.slug}`} className="block">
                  <ProductImage src={related.images[0] ?? "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=500&fit=crop"} alt={related.name} className="h-32 w-full rounded-lg object-cover" width={800} height={500} />
                </Link>
                <Link href={`/shop/${related.slug}`} className="mt-2 block text-sm font-semibold hover:text-accent">{related.name}</Link>
                <p className="mt-0.5 text-sm font-bold text-accent">{formatUsd(related.pricePerUnitCents)} <span className="font-normal text-muted-foreground">{related.unitDisplay}</span></p>
                <div className="mt-3">
                  <AddToCartButton productId={related.id} name={related.name} unitPriceCents={related.pricePerUnitCents} deliveryType={related.deliveryType} materialClass={related.materialClass} />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Trust bar ──────────────────────────────────── */}
      <section className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-3">
        <div className="flex items-center gap-3">
          <Truck className="size-5 text-accent" />
          <div>
            <p className="text-sm font-semibold">Same-Week Delivery</p>
            <p className="text-xs text-muted-foreground">Across Suffolk County</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CheckCircle className="size-5 text-accent" />
          <div>
            <p className="text-sm font-semibold">Transparent Pricing</p>
            <p className="text-xs text-muted-foreground">No hidden fees</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Phone className="size-5 text-accent" />
          <div>
            <p className="text-sm font-semibold">Call (631) 874-6244</p>
            <p className="text-xs text-muted-foreground">Mon-Sat 7am-4pm</p>
          </div>
        </div>
      </section>
    </div>
  );
}
