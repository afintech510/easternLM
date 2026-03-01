"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const imageList = product.images.length > 0 ? product.images : ["https://via.placeholder.com/1200x800?text=Product"];

  return (
    <div className="space-y-8">
      <section className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          <Image
            src={imageList[activeImageIndex] ?? imageList[0]}
            alt={product.name}
            className="h-[420px] w-full rounded-2xl border object-cover"
            width={1200}
            height={800}
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
                <Image
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
          <p className="text-muted-foreground">{product.description}</p>
          <p className="text-2xl font-semibold text-primary">
            {formatUsd(product.pricePerUnitCents)} {product.unitDisplay}
          </p>

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
                <Input
                  placeholder="Enter full delivery address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
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
                Pickup at 543 Montauk Hwy, East Moriches, NY 11940 during yard hours.
              </p>
            )}

            {deliveryError ? <p className="text-xs text-destructive">{deliveryError}</p> : null}
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
            <Input value={yardLength} onChange={(event) => setYardLength(event.target.value)} inputMode="decimal" />
            <Input value={yardWidth} onChange={(event) => setYardWidth(event.target.value)} inputMode="decimal" />
            <Input value={yardDepth} onChange={(event) => setYardDepth(event.target.value)} inputMode="decimal" />
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
                  className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs text-primary"
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
                  <Image
                    src={related.images[0] ?? "https://via.placeholder.com/800x500?text=Product"}
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
    </div>
  );
}
