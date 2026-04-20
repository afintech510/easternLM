export type DeliveryType = "bulk" | "non-bulk";
export type MaterialClass = "mulch" | "default";
export type FulfillmentMethod = "pickup" | "delivery";
export type CustomerType = "standard" | "pro";

export type TruckType = {
  name: string;
  capacityMulch: number;
  capacityDefault: number;
  sortOrder: number;
};

export type CartItem = {
  id: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  deliveryType: DeliveryType;
  materialClass: MaterialClass;
  fulfillmentMethod?: FulfillmentMethod;
};

export type DistanceMatrixResult = {
  distanceMeters: number;
  durationSeconds: number;
};

export type DeliveryPricingConfig = {
  milesPerGallon: number;
  fuelPricePerGallon: number;
  hourlyLaborRate: number;
  dumpTimeBufferMinutes: number;
  profitMultiplier: number;
  roundToNearest: number;
  minimumDeliveryFee: number;
  additionalLoadDiscount: number;
  minimumOrderCents: number;
  localRadiusMiles: number;
  maxServiceRadiusMiles: number;
  taxRate: number;
  ccSurchargeRate: number;
  proDiscountRate: number;
  proDiscountPickupOnly: boolean;
};

export type DeliveryLoad = {
  truckName: string;
  materialClass: MaterialClass | "mixed" | "non-bulk";
  quantity: number;
  feeCents: number;
  day: number;
};

export type PaymentMethod = "card" | "cod";

export const COD_DISCOUNT_RATE = 0.035;

export type DeliveryCalculationResult = {
  subtotalCents: number;
  proDiscountCents: number;
  discountedSubtotalCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  ccSurchargeCents: number;
  codDiscountCents: number;
  grandTotalCents: number;
  firstLoadFeeCents: number;
  additionalLoadFeeCents: number;
  totalLoads: number;
  totalDeliveryDays: number;
  oneWayMiles: number;
  outsideServiceArea: boolean;
  belowMinimum: boolean;
  checkoutBlocked: boolean;
  loads: DeliveryLoad[];
  error?: string;
};

/**
 * Applies COD payment method adjustments to a delivery calculation result.
 * - Removes the CC surcharge (customer isn't paying by card)
 * - Applies a 3% discount on the pre-CC total (subtotal + delivery + tax)
 * - Returns a new result with codDiscountCents populated and grandTotal adjusted
 */
export function applyCodAdjustment(
  result: DeliveryCalculationResult
): DeliveryCalculationResult {
  const preCcTotal =
    result.discountedSubtotalCents + result.deliveryFeeCents + result.taxCents;
  const codDiscountCents = Math.round(preCcTotal * COD_DISCOUNT_RATE);
  return {
    ...result,
    ccSurchargeCents: 0,
    codDiscountCents,
    grandTotalCents: preCcTotal - codDiscountCents,
  };
}

type FeeOverrides = {
  firstLoadFeeCents?: number;
  additionalLoadFeeCents?: number;
};

export type CalculateDeliveryFeesInput = {
  cartItems: CartItem[];
  distanceResult: DistanceMatrixResult | null;
  pricingConfig: DeliveryPricingConfig;
  truckTypes: TruckType[];
  combineLoads: boolean;
  deliveryMethod: FulfillmentMethod;
  customerType?: CustomerType;
  feeOverrides?: FeeOverrides;
};

export type DeliveryFeeCacheEntry = {
  addressHash: string;
  distanceMeters: number;
  durationSeconds: number;
  expiresAt: string;
  firstLoadFeeCents: number;
  additionalLoadFeeCents: number;
};

export type DeliveryFeeCacheAdapter = {
  getByAddressHash: (addressHash: string) => Promise<DeliveryFeeCacheEntry | null>;
  set: (entry: DeliveryFeeCacheEntry) => Promise<void>;
};

export type CalculateDeliveryFeesWithCacheInput = Omit<
  CalculateDeliveryFeesInput,
  "distanceResult" | "feeOverrides"
> & {
  distanceResult?: DistanceMatrixResult | null;
  addressHash?: string;
  cache?: DeliveryFeeCacheAdapter;
  fetchDistance?: () => Promise<DistanceMatrixResult>;
  now?: Date;
};

const METERS_PER_MILE = 1609.344;

function dollarsToCents(value: number) {
  return Math.round(value * 100);
}

function centsToDollars(value: number) {
  return value / 100;
}

function ceilToNearest(value: number, nearest: number) {
  return Math.ceil(value / nearest) * nearest;
}

function calculateSubtotalCents(cartItems: CartItem[]) {
  return cartItems.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPriceCents), 0);
}

function calculateProDiscountCents({
  customerType,
  deliveryMethod,
  subtotalCents,
  pricingConfig,
}: {
  customerType: CustomerType;
  deliveryMethod: FulfillmentMethod;
  subtotalCents: number;
  pricingConfig: DeliveryPricingConfig;
}) {
  if (customerType !== "pro") {
    return 0;
  }

  if (pricingConfig.proDiscountPickupOnly && deliveryMethod !== "pickup") {
    return 0;
  }

  return Math.round(subtotalCents * pricingConfig.proDiscountRate);
}

function getCapacityForClass(truck: TruckType, materialClass: MaterialClass) {
  return materialClass === "mulch" ? truck.capacityMulch : truck.capacityDefault;
}

function buildBulkLoadsForQuantity({
  quantity,
  materialClass,
  truckTypes,
}: {
  quantity: number;
  materialClass: MaterialClass;
  truckTypes: TruckType[];
}) {
  if (quantity <= 0) {
    return [] as Array<{ truckName: string; quantity: number; materialClass: MaterialClass }>;
  }

  const sortedBySmallest = [...truckTypes].sort((a, b) => {
    const capacityDiff = getCapacityForClass(a, materialClass) - getCapacityForClass(b, materialClass);
    if (capacityDiff !== 0) {
      return capacityDiff;
    }
    return a.sortOrder - b.sortOrder;
  });

  const sortedByLargest = [...sortedBySmallest].reverse();
  const largest = sortedByLargest[0];

  if (!largest || getCapacityForClass(largest, materialClass) <= 0) {
    throw new Error("Truck fleet is missing a valid capacity configuration.");
  }

  const loads: Array<{ truckName: string; quantity: number; materialClass: MaterialClass }> = [];
  let remaining = quantity;
  const epsilon = 0.0001;

  while (remaining > epsilon) {
    const smallestThatFits = sortedBySmallest.find(
      (truck) => getCapacityForClass(truck, materialClass) >= remaining,
    );

    const selected = smallestThatFits ?? largest;
    const selectedCapacity = getCapacityForClass(selected, materialClass);
    const loadQuantity = Math.min(remaining, selectedCapacity);

    loads.push({
      truckName: selected.name,
      quantity: Number(loadQuantity.toFixed(2)),
      materialClass,
    });

    remaining = Number((remaining - loadQuantity).toFixed(4));
  }

  return loads;
}

function calculateFirstLoadFeeCents({
  oneWayMiles,
  durationSeconds,
  pricingConfig,
}: {
  oneWayMiles: number;
  durationSeconds: number;
  pricingConfig: DeliveryPricingConfig;
}) {
  const roundTripMiles = oneWayMiles * 2;
  // Round-trip duration = 2x one-way + dump time buffer (on-site unloading)
  const dumpBufferSeconds = (pricingConfig.dumpTimeBufferMinutes ?? 5) * 60;
  const roundTripMinutes = (durationSeconds * 2 + dumpBufferSeconds) / 60;

  const fuelCost = (roundTripMiles / pricingConfig.milesPerGallon) * pricingConfig.fuelPricePerGallon;
  const laborCost = (roundTripMinutes / 60) * pricingConfig.hourlyLaborRate;
  const rawCost = fuelCost + laborCost;
  const withProfit = rawCost * pricingConfig.profitMultiplier;
  const rounded = ceilToNearest(withProfit, pricingConfig.roundToNearest);
  const clamped = Math.max(rounded, pricingConfig.minimumDeliveryFee);

  return dollarsToCents(clamped);
}

function calculateAdditionalLoadFeeCents({
  firstLoadFeeCents,
  pricingConfig,
}: {
  firstLoadFeeCents: number;
  pricingConfig: DeliveryPricingConfig;
}) {
  const discounted = centsToDollars(firstLoadFeeCents) * (1 - pricingConfig.additionalLoadDiscount);
  const rounded = ceilToNearest(discounted, pricingConfig.roundToNearest);
  const clamped = Math.max(rounded, pricingConfig.minimumDeliveryFee);
  return dollarsToCents(clamped);
}

function buildNoDeliveryResult({
  subtotalCents,
  proDiscountCents,
  discountedSubtotalCents,
  pricingConfig,
}: {
  subtotalCents: number;
  proDiscountCents: number;
  discountedSubtotalCents: number;
  pricingConfig: DeliveryPricingConfig;
}): DeliveryCalculationResult {
  const taxCents = Math.round(discountedSubtotalCents * pricingConfig.taxRate);
  const ccSurchargeCents = Math.round(
    (discountedSubtotalCents + taxCents) * pricingConfig.ccSurchargeRate,
  );
  const grandTotalCents = discountedSubtotalCents + taxCents + ccSurchargeCents;

  return {
    subtotalCents,
    proDiscountCents,
    discountedSubtotalCents,
    deliveryFeeCents: 0,
    taxCents,
    ccSurchargeCents,
    codDiscountCents: 0,
    grandTotalCents,
    firstLoadFeeCents: 0,
    additionalLoadFeeCents: 0,
    totalLoads: 0,
    totalDeliveryDays: 0,
    oneWayMiles: 0,
    outsideServiceArea: false,
    belowMinimum: false,
    checkoutBlocked: false,
    loads: [],
  };
}

export function calculateDeliveryFees(input: CalculateDeliveryFeesInput): DeliveryCalculationResult {
  const {
    cartItems,
    distanceResult,
    pricingConfig,
    truckTypes,
    combineLoads,
    deliveryMethod,
    customerType = "standard",
    feeOverrides,
  } = input;

  const subtotalCents = calculateSubtotalCents(cartItems);
  const proDiscountCents = calculateProDiscountCents({
    customerType,
    deliveryMethod,
    subtotalCents,
    pricingConfig,
  });
  const discountedSubtotalCents = subtotalCents - proDiscountCents;

  const deliveryItems = cartItems.filter((item) => {
    const method = item.fulfillmentMethod ?? deliveryMethod;
    return method === "delivery";
  });

  const isPickupOnly = deliveryMethod === "pickup" || deliveryItems.length === 0;
  if (isPickupOnly) {
    return buildNoDeliveryResult({
      subtotalCents,
      proDiscountCents,
      discountedSubtotalCents,
      pricingConfig,
    });
  }

  if (!distanceResult) {
    return {
      ...buildNoDeliveryResult({
        subtotalCents,
        proDiscountCents,
        discountedSubtotalCents,
        pricingConfig,
      }),
      checkoutBlocked: true,
      error: "Distance data is required for delivery calculations.",
    };
  }

  const oneWayMiles = distanceResult.distanceMeters / METERS_PER_MILE;
  const outsideServiceArea = oneWayMiles > pricingConfig.maxServiceRadiusMiles;
  if (outsideServiceArea) {
    return {
      ...buildNoDeliveryResult({
        subtotalCents,
        proDiscountCents,
        discountedSubtotalCents,
        pricingConfig,
      }),
      oneWayMiles,
      outsideServiceArea: true,
      checkoutBlocked: true,
    };
  }

  const firstLoadFeeCents =
    feeOverrides?.firstLoadFeeCents ??
    calculateFirstLoadFeeCents({
      oneWayMiles,
      durationSeconds: distanceResult.durationSeconds,
      pricingConfig,
    });

  const additionalLoadFeeCents =
    feeOverrides?.additionalLoadFeeCents ??
    calculateAdditionalLoadFeeCents({
      firstLoadFeeCents,
      pricingConfig,
    });

  const bulkItems = deliveryItems.filter((item) => item.deliveryType === "bulk");
  const nonBulkItems = deliveryItems.filter((item) => item.deliveryType === "non-bulk");

  const loads: DeliveryLoad[] = [];

  if (bulkItems.length > 0) {
    if (combineLoads) {
      const combinedQuantity = bulkItems.reduce((sum, item) => sum + item.quantity, 0);
      const combinedClass: MaterialClass = bulkItems.every((item) => item.materialClass === "mulch")
        ? "mulch"
        : "default";

      const bulkLoads = buildBulkLoadsForQuantity({
        quantity: combinedQuantity,
        materialClass: combinedClass,
        truckTypes,
      });

      bulkLoads.forEach((load) => {
        loads.push({
          truckName: load.truckName,
          materialClass: combinedClass === "default" && bulkItems.some((x) => x.materialClass === "mulch")
            ? "mixed"
            : load.materialClass,
          quantity: load.quantity,
          feeCents: 0,
          day: 0,
        });
      });
    } else {
      bulkItems.forEach((item) => {
        const itemLoads = buildBulkLoadsForQuantity({
          quantity: item.quantity,
          materialClass: item.materialClass,
          truckTypes,
        });

        itemLoads.forEach((load) => {
          loads.push({
            truckName: load.truckName,
            materialClass: load.materialClass,
            quantity: load.quantity,
            feeCents: 0,
            day: 0,
          });
        });
      });
    }
  } else if (nonBulkItems.length > 0) {
    loads.push({
      truckName: "Non-bulk delivery",
      materialClass: "non-bulk",
      quantity: nonBulkItems.reduce((sum, item) => sum + item.quantity, 0),
      feeCents: 0,
      day: 0,
    });
  }

  loads.forEach((load, index) => {
    load.feeCents = index === 0 ? firstLoadFeeCents : additionalLoadFeeCents;
    load.day = index + 1;
  });

  const deliveryFeeCents = loads.reduce((sum, load) => sum + load.feeCents, 0);
  const belowMinimum =
    oneWayMiles > pricingConfig.localRadiusMiles &&
    discountedSubtotalCents < pricingConfig.minimumOrderCents &&
    deliveryMethod === "delivery";

  const taxCents = Math.round((discountedSubtotalCents + deliveryFeeCents) * pricingConfig.taxRate);
  const ccSurchargeCents = Math.round(
    (discountedSubtotalCents + deliveryFeeCents + taxCents) * pricingConfig.ccSurchargeRate,
  );
  const grandTotalCents = discountedSubtotalCents + deliveryFeeCents + taxCents + ccSurchargeCents;

  return {
    subtotalCents,
    proDiscountCents,
    discountedSubtotalCents,
    deliveryFeeCents,
    taxCents,
    ccSurchargeCents,
    codDiscountCents: 0,
    grandTotalCents,
    firstLoadFeeCents,
    additionalLoadFeeCents,
    totalLoads: loads.length,
    totalDeliveryDays: loads.length,
    oneWayMiles,
    outsideServiceArea,
    belowMinimum,
    checkoutBlocked: belowMinimum || outsideServiceArea,
    loads,
  };
}

export async function calculateDeliveryFeesWithCache(
  input: CalculateDeliveryFeesWithCacheInput,
): Promise<DeliveryCalculationResult> {
  const {
    addressHash,
    cache,
    fetchDistance,
    now = new Date(),
    distanceResult,
    ...rest
  } = input;

  let effectiveDistance = distanceResult ?? null;
  let feeOverrides: FeeOverrides = {};
  let usedCache = false;

  if (addressHash && cache) {
    const cached = await cache.getByAddressHash(addressHash);
    if (cached && new Date(cached.expiresAt).getTime() > now.getTime()) {
      effectiveDistance = {
        distanceMeters: cached.distanceMeters,
        durationSeconds: cached.durationSeconds,
      };
      feeOverrides = {
        firstLoadFeeCents: cached.firstLoadFeeCents,
        additionalLoadFeeCents: cached.additionalLoadFeeCents,
      };
      usedCache = true;
    }
  }

  if (!effectiveDistance && fetchDistance) {
    try {
      effectiveDistance = await fetchDistance();
    } catch {
      return {
        ...buildNoDeliveryResult({
          subtotalCents: calculateSubtotalCents(rest.cartItems),
          proDiscountCents: 0,
          discountedSubtotalCents: calculateSubtotalCents(rest.cartItems),
          pricingConfig: rest.pricingConfig,
        }),
        checkoutBlocked: true,
        error: "Unable to calculate delivery from Google Maps.",
      };
    }
  }

  const calculation = calculateDeliveryFees({
    ...rest,
    distanceResult: effectiveDistance,
    feeOverrides,
  });

  if (!usedCache && addressHash && cache && effectiveDistance && !calculation.error) {
    await cache.set({
      addressHash,
      distanceMeters: effectiveDistance.distanceMeters,
      durationSeconds: effectiveDistance.durationSeconds,
      firstLoadFeeCents: calculation.firstLoadFeeCents,
      additionalLoadFeeCents: calculation.additionalLoadFeeCents,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  return calculation;
}
