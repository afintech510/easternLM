"use client";

import Link from "next/link";
import Image from "next/image";
import { ProductImage } from "@/components/ui/product-image";
import { useEffect, useMemo, useState } from "react";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) {
    return `${minutes} min`;
  }
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
  const [deliveryConfig, setDeliveryConfig] = useState<{
    pricingConfig: DeliveryPricingConfig;
    truckTypes: TruckType[];
  } | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [isCheckingDelivery, setIsCheckingDelivery] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [yardLength, setYardLength] = useState("20");
  const [yardWidth, setYardWidth] = useState("10");
  const [yardDepth, setYardDepth] = useState("3");

  useEffect(() => {
    fetch("/api/delivery/config", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load delivery configuration.");
        }
        return response.json() as Promise<{
          pricingConfig: DeliveryPricingConfig;
          truckTypes: TruckType[];
        }>;
      })
      .then((data) => setDeliveryConfig(data))
      .catch((error: unknown) =>
        setDeliveryError(error instanceof Error ? error.message : "Unable to load delivery configuration."),
      );
  }, []);

  const yardsEstimate = useMemo(() => {
    const length = Number(yardLength);
    const width = Number(yardWidth);
    const depth = Number(yardDepth);
    if (!Number.isFinite(length) || !Number.isFinite(width) || !Number.isFinite(depth)) {
      return 0;
    }
    return (length * width * (depth / 12)) / 27;
  }, [yardDepth, yardLength, yardWidth]);

  const deliveryCalculation = useMemo(() => {
    if (!distancePreview || !deliveryConfig) {
      return null;
    }

    return calculateDeliveryFees({
      cartItems: [
        {
          id: product.id,
          name: product.name,
          quantity,
          unitPriceCents: product.pricePerUnitCents,
          deliveryType: product.deliveryType,
          materialClass: product.materialClass,
          fulfillmentMethod: deliveryMethod,
        },
      ],
      distanceResult:
        deliveryMethod === "delivery"
          ? {
              distanceMeters: distancePreview.oneWayMiles * 1609.344,
              durationSeconds: distancePreview.durationSeconds,
            }
          : null,
      pricingConfig: deliveryConfig.pricingConfig,
      truckTypes: deliveryConfig.truckTypes,
      combineLoads: false,
      deliveryMethod,
    });
  }, [deliveryConfig, deliveryMethod, distancePreview, product, quantity]);

  const imageList = product.images.length > 0 ? product.images : ["https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1200&h=800&fit=crop"];

  return (
    <div className="space-y-8">
      <section className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          <ProductImage
            src={imageList[activeImageIndex] ?? imageList[0]}
            alt={product.name}
            className="h-[420px] w-full rounded-2xl border object-cover"
            width={1200}
            height={800}
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
          <div className="grid grid-cols-4 gap-2">
            {imageList.slice(0, 4).map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                className={`overflow-hidden rounded-lg border ${
                  index === activeImageIndex ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setActiveImageIndex(index)}
              >
                <ProductImage
                  src={image}
                  alt={`${product.name} ${index + 1}`}
                  className="h-20 w-full object-cover"
                  width={400}
                  height={200}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {product.categoryName}
          </p>
          <h1 className="[font-family:var(--font-display)] text-4xl text-primary">{product.name}</h1>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 font-medium text-green-600">
              <svg className="size-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              In Stock
            </span>
            {product.deliveryType === "bulk" && (
              <span className="text-muted-foreground">Bulk delivery available</span>
            )}
          </div>
          <p className="text-2xl font-semibold text-primary">
            {formatUsd(product.pricePerUnitCents)}{" "}
            <span className="text-base font-normal text-muted-foreground">{product.unitDisplay}</span>
          </p>
          {product.priceNote && (
            <p className="text-sm text-muted-foreground">{product.priceNote}</p>
          )}
          <p className="text-muted-foreground">{product.description}</p>

          <article className="space-y-3 rounded-2xl border bg-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Quantity</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setQuantity((current) =>
                    clampQuantity(current - product.stepQty, product.minQty, product.maxQty, product.stepQty),
                  )
                }
              >
                -
              </Button>
              <Input
                value={String(quantity)}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (!Number.isFinite(next)) {
                    return;
                  }
                  setQuantity(clampQuantity(next, product.minQty, product.maxQty, product.stepQty));
                }}
                inputMode="decimal"
                className="w-28 text-center"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setQuantity((current) =>
                    clampQuantity(current + product.stepQty, product.minQty, product.maxQty, product.stepQty),
                  )
                }
              >
                +
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Min: {product.minQty} • Max: {product.maxQty} • Step: {product.stepQty}
            </p>
          </article>

          <article className="space-y-3 rounded-2xl border bg-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Delivery / Pickup</h2>
            <div className="flex gap-2">
              <Button
                variant={deliveryMethod === "delivery" ? "default" : "outline"}
                onClick={() => setDeliveryMethod("delivery")}
              >
                Delivery
              </Button>
              <Button
                variant={deliveryMethod === "pickup" ? "default" : "outline"}
                onClick={() => setDeliveryMethod("pickup")}
              >
                Pickup
              </Button>
            </div>

            {deliveryMethod === "delivery" ? (
              <div className="space-y-2">
                <AddressAutocomplete
                  placeholder="Enter full delivery address"
                  value={address}
                  onChange={setAddress}
                />
                <Button
                  disabled={isCheckingDelivery || address.trim().length < 8}
                  onClick={async () => {
                    setIsCheckingDelivery(true);
                    setDeliveryError(null);
                    try {
                      const response = await fetch("/api/delivery/distance", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ address }),
                      });

                      const payload = (await response.json()) as
                        | DistancePreview
                        | {
                            error: string;
                          };

                      if (!response.ok || "error" in payload) {
                        throw new Error("error" in payload ? payload.error : "Failed to calculate delivery.");
                      }

                      setDistancePreview(payload);
                    } catch (error) {
                      setDistancePreview(null);
                      setDeliveryError(
                        error instanceof Error ? error.message : "Unable to calculate delivery for this address.",
                      );
                    } finally {
                      setIsCheckingDelivery(false);
                    }
                  }}
                >
                  {isCheckingDelivery ? "Checking..." : "Check Delivery Fee"}
                </Button>

                {deliveryCalculation ? (
                  <div className="rounded-lg border bg-background p-3 text-sm">
                    <p className="font-semibold">
                      Delivery: {formatUsd(deliveryCalculation.firstLoadFeeCents)} per load
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Drive time: {formatDuration(distancePreview?.durationSeconds ?? 0)} one-way •{" "}
                      {distancePreview?.oneWayMiles.toFixed(1)} miles
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Estimated loads: {deliveryCalculation.totalLoads} (days: {deliveryCalculation.totalDeliveryDays})
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Pickup at 110 Frowein Road, Center Moriches, NY 11934 during yard hours.
              </p>
            )}

            {deliveryError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {deliveryError}
              </div>
            ) : null}
          </article>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              onClick={async () => {
                setIsAdding(true);
                await addItem({
                  id: product.id,
                  name: product.name,
                  quantity,
                  unitPriceCents: product.pricePerUnitCents,
                  deliveryType: product.deliveryType,
                  materialClass: product.materialClass,
                  fulfillmentMethod: deliveryMethod,
                });
                setIsAdding(false);
              }}
            >
              {isAdding ? "Adding..." : "Add Selected Quantity"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/cart">Go to Cart</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="space-y-3 rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold">Yard Calculator</h2>
          <p className="text-sm text-muted-foreground">Length × Width × Depth(in) ÷ 27 = cubic yards.</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Length (ft)</label>
              <Input value={yardLength} onChange={(event) => setYardLength(event.target.value)} inputMode="decimal" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Width (ft)</label>
              <Input value={yardWidth} onChange={(event) => setYardWidth(event.target.value)} inputMode="decimal" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Depth (in)</label>
              <Input value={yardDepth} onChange={(event) => setYardDepth(event.target.value)} inputMode="decimal" />
            </div>
          </div>
          <p className="text-sm font-semibold text-primary">{yardsEstimate.toFixed(2)} cubic yards</p>
          <Button
            variant="outline"
            onClick={() =>
              setQuantity(clampQuantity(yardsEstimate, product.minQty, product.maxQty, product.stepQty))
            }
          >
            Use This Quantity
          </Button>
        </article>

        <article className="space-y-3 rounded-2xl border bg-card p-5">
          <h2 className="text-lg font-semibold">Recommended Uses</h2>
          <div className="flex flex-wrap gap-2">
            {product.recommendedUses.length > 0 ? (
              product.recommendedUses.map((useCase) => (
                <span
                  key={useCase}
                  className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs text-accent"
                >
                  {useCase}
                </span>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Recommended-use content is being finalized.</p>
            )}
          </div>
        </article>
      </section>

      <section className="space-y-4">
        <h2 className="[font-family:var(--font-display)] text-3xl text-primary">Pairs Well With</h2>
        {relatedProducts.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedProducts.map((related) => (
              <article key={related.id} className="rounded-2xl border bg-card p-4">
                <Link href={`/shop/${related.slug}`} className="block">
                  <ProductImage
                    src={related.images[0] ?? "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=500&fit=crop"}
                    alt={related.name}
                    className="h-36 w-full rounded-lg object-cover"
                    width={800}
                    height={500}
                  />
                </Link>
                <Link href={`/shop/${related.slug}`} className="mt-2 block text-sm font-semibold hover:text-primary">
                  {related.name}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatUsd(related.pricePerUnitCents)} {related.unitDisplay}
                </p>
                <AddToCartButton
                  productId={related.id}
                  name={related.name}
                  unitPriceCents={related.pricePerUnitCents}
                  deliveryType={related.deliveryType}
                  materialClass={related.materialClass}
                />
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Cross-sell recommendations are being finalized.</p>
        )}
      </section>

      {/* Trust bar */}
      <section className="grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-accent/10 text-accent">
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
          </div>
          <div>
            <p className="text-sm font-semibold">Same-Week Delivery</p>
            <p className="text-xs text-muted-foreground">Across Suffolk County</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-accent/10 text-accent">
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <p className="text-sm font-semibold">Transparent Pricing</p>
            <p className="text-xs text-muted-foreground">No hidden fees</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-accent/10 text-accent">
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
          </div>
          <div>
            <p className="text-sm font-semibold">Call (631) 874-6244</p>
            <p className="text-xs text-muted-foreground">Mon–Sat 7am–4pm</p>
          </div>
        </div>
      </section>
    </div>
  );
}
