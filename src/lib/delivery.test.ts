import {
  calculateDeliveryFees,
  calculateDeliveryFeesWithCache,
  type CartItem,
  type DeliveryPricingConfig,
  type DistanceMatrixResult,
  type TruckType,
} from "@/lib/delivery";

const truckTypes: TruckType[] = [
  { name: "Small Dump", capacityMulch: 7, capacityDefault: 5, sortOrder: 1 },
  { name: "Medium Dump", capacityMulch: 10, capacityDefault: 10, sortOrder: 2 },
  { name: "Tri-Axle", capacityMulch: 20, capacityDefault: 20, sortOrder: 3 },
];

const pricingConfig: DeliveryPricingConfig = {
  milesPerGallon: 6,
  fuelPricePerGallon: 4,
  hourlyLaborRate: 30,
  profitMultiplier: 2,
  roundToNearest: 5,
  minimumDeliveryFee: 25,
  additionalLoadDiscount: 0.25,
  minimumOrderCents: 12500,
  localRadiusMiles: 5,
  maxServiceRadiusMiles: 50,
  taxRate: 0.0875,
  ccSurchargeRate: 0.03,
  proDiscountRate: 0.05,
  proDiscountPickupOnly: true,
};

function milesToMeters(miles: number) {
  return miles * 1609.344;
}

function distance(oneWayMiles: number, roundTripMinutes: number): DistanceMatrixResult {
  return {
    distanceMeters: milesToMeters(oneWayMiles),
    durationSeconds: roundTripMinutes * 60,
  };
}

function item(partial: Partial<CartItem> = {}): CartItem {
  return {
    id: partial.id ?? "product-1",
    name: partial.name ?? "Screened Topsoil",
    quantity: partial.quantity ?? 1,
    unitPriceCents: partial.unitPriceCents ?? 3900,
    deliveryType: partial.deliveryType ?? "bulk",
    materialClass: partial.materialClass ?? "default",
    fulfillmentMethod: partial.fulfillmentMethod,
  };
}

describe("calculateDeliveryFees", () => {
  test("Test 1: 8mi address returns $60 first-load fee with formula", () => {
    const result = calculateDeliveryFees({
      cartItems: [item({ quantity: 3 })],
      distanceResult: distance(8, 35),
      pricingConfig,
      truckTypes,
      combineLoads: false,
      deliveryMethod: "delivery",
    });

    expect(result.firstLoadFeeCents).toBe(6000);
  });

  test("Test 2: 15mi address returns about $95 first-load fee", () => {
    const result = calculateDeliveryFees({
      cartItems: [item({ quantity: 3 })],
      distanceResult: distance(15, 55),
      pricingConfig,
      truckTypes,
      combineLoads: false,
      deliveryMethod: "delivery",
    });

    expect(result.firstLoadFeeCents).toBe(9500);
  });

  test("Test 3: 25mi address returns about $145 first-load fee", () => {
    const result = calculateDeliveryFees({
      cartItems: [item({ quantity: 3 })],
      distanceResult: distance(25, 75),
      pricingConfig,
      truckTypes,
      combineLoads: false,
      deliveryMethod: "delivery",
    });

    expect(result.firstLoadFeeCents).toBe(14500);
  });

  test("Test 4: very close address applies $25 minimum fee", () => {
    const result = calculateDeliveryFees({
      cartItems: [item({ quantity: 3 })],
      distanceResult: distance(2, 8),
      pricingConfig,
      truckTypes,
      combineLoads: false,
      deliveryMethod: "delivery",
    });

    expect(result.firstLoadFeeCents).toBe(2500);
  });

  test("Test 5: address beyond max radius flags outside service area", () => {
    const result = calculateDeliveryFees({
      cartItems: [item({ quantity: 3 })],
      distanceResult: distance(55, 95),
      pricingConfig,
      truckTypes,
      combineLoads: false,
      deliveryMethod: "delivery",
    });

    expect(result.outsideServiceArea).toBe(true);
    expect(result.checkoutBlocked).toBe(true);
  });

  test("Test 6: second load is 75% of first and rounded", () => {
    const result = calculateDeliveryFees({
      cartItems: [item({ quantity: 7 })],
      distanceResult: distance(8, 35),
      pricingConfig,
      truckTypes,
      combineLoads: false,
      deliveryMethod: "delivery",
    });

    expect(result.firstLoadFeeCents).toBe(6000);
    expect(result.additionalLoadFeeCents).toBe(4500);
  });

  test("Test 7: three loads totals $150 (60 + 45 + 45)", () => {
    const result = calculateDeliveryFees({
      cartItems: [item({ quantity: 45 })],
      distanceResult: distance(8, 35),
      pricingConfig,
      truckTypes,
      combineLoads: false,
      deliveryMethod: "delivery",
    });

    expect(result.totalLoads).toBe(3);
    expect(result.deliveryFeeCents).toBe(15000);
  });

  test("Test 8: 3yd topsoil selects Small Dump", () => {
    const result = calculateDeliveryFees({
      cartItems: [item({ quantity: 3 })],
      distanceResult: distance(8, 35),
      pricingConfig,
      truckTypes,
      combineLoads: false,
      deliveryMethod: "delivery",
    });

    expect(result.loads).toHaveLength(1);
    expect(result.loads[0]?.truckName).toBe("Small Dump");
  });

  test("Test 9: 8yd topsoil selects Medium Dump", () => {
    const result = calculateDeliveryFees({
      cartItems: [item({ quantity: 8 })],
      distanceResult: distance(8, 35),
      pricingConfig,
      truckTypes,
      combineLoads: false,
      deliveryMethod: "delivery",
    });

    expect(result.loads).toHaveLength(1);
    expect(result.loads[0]?.truckName).toBe("Medium Dump");
  });

  test("Test 10: 25yd topsoil selects Tri-Axle + Small Dump (2 loads)", () => {
    const result = calculateDeliveryFees({
      cartItems: [item({ quantity: 25 })],
      distanceResult: distance(8, 35),
      pricingConfig,
      truckTypes,
      combineLoads: false,
      deliveryMethod: "delivery",
    });

    expect(result.totalLoads).toBe(2);
    expect(result.loads.map((load) => load.truckName)).toEqual(["Tri-Axle", "Small Dump"]);
    expect(result.totalDeliveryDays).toBe(2);
  });

  test("Test 11: 5yd mulch selects Small Dump", () => {
    const result = calculateDeliveryFees({
      cartItems: [item({ quantity: 5, materialClass: "mulch" })],
      distanceResult: distance(8, 35),
      pricingConfig,
      truckTypes,
      combineLoads: false,
      deliveryMethod: "delivery",
    });

    expect(result.loads).toHaveLength(1);
    expect(result.loads[0]?.truckName).toBe("Small Dump");
  });

  test("Test 12: combineLoads=true lets topsoil+mulch share one Small Dump", () => {
    const result = calculateDeliveryFees({
      cartItems: [item({ quantity: 2 }), item({ id: "m1", name: "Mulch", quantity: 2, materialClass: "mulch" })],
      distanceResult: distance(8, 35),
      pricingConfig,
      truckTypes,
      combineLoads: true,
      deliveryMethod: "delivery",
    });

    expect(result.totalLoads).toBe(1);
    expect(result.loads[0]?.truckName).toBe("Small Dump");
  });

  test("Test 13: combineLoads=false keeps topsoil+mulch as two loads", () => {
    const result = calculateDeliveryFees({
      cartItems: [item({ quantity: 2 }), item({ id: "m1", name: "Mulch", quantity: 2, materialClass: "mulch" })],
      distanceResult: distance(8, 35),
      pricingConfig,
      truckTypes,
      combineLoads: false,
      deliveryMethod: "delivery",
    });

    expect(result.totalLoads).toBe(2);
    expect(result.totalDeliveryDays).toBe(2);
  });

  test("Test 14: non-bulk only delivery uses one delivery fee", () => {
    const result = calculateDeliveryFees({
      cartItems: [item({ deliveryType: "non-bulk", materialClass: "default", quantity: 15 })],
      distanceResult: distance(8, 35),
      pricingConfig,
      truckTypes,
      combineLoads: false,
      deliveryMethod: "delivery",
    });

    expect(result.totalLoads).toBe(1);
    expect(result.deliveryFeeCents).toBe(6000);
  });

  test("Test 15: bulk + non-bulk keeps non-bulk riding free", () => {
    const result = calculateDeliveryFees({
      cartItems: [
        item({ id: "bulk", quantity: 3, deliveryType: "bulk" }),
        item({ id: "nb", deliveryType: "non-bulk", quantity: 20, unitPriceCents: 599 }),
      ],
      distanceResult: distance(8, 35),
      pricingConfig,
      truckTypes,
      combineLoads: false,
      deliveryMethod: "delivery",
    });

    expect(result.totalLoads).toBe(1);
    expect(result.deliveryFeeCents).toBe(6000);
  });

  test("Test 16: all pickup returns $0 delivery and no minimum", () => {
    const result = calculateDeliveryFees({
      cartItems: [item({ quantity: 2 })],
      distanceResult: null,
      pricingConfig,
      truckTypes,
      combineLoads: false,
      deliveryMethod: "pickup",
    });

    expect(result.deliveryFeeCents).toBe(0);
    expect(result.belowMinimum).toBe(false);
    expect(result.checkoutBlocked).toBe(false);
  });

  test("Test 17: $90 subtotal beyond local radius is below minimum", () => {
    const result = calculateDeliveryFees({
      cartItems: [item({ unitPriceCents: 4500, quantity: 2 })],
      distanceResult: distance(8, 35),
      pricingConfig,
      truckTypes,
      combineLoads: false,
      deliveryMethod: "delivery",
    });

    expect(result.discountedSubtotalCents).toBe(9000);
    expect(result.belowMinimum).toBe(true);
    expect(result.checkoutBlocked).toBe(true);
  });

  test("Test 18: $30 subtotal within 5 miles is not below minimum", () => {
    const result = calculateDeliveryFees({
      cartItems: [item({ unitPriceCents: 3000, quantity: 1 })],
      distanceResult: distance(4, 18),
      pricingConfig,
      truckTypes,
      combineLoads: false,
      deliveryMethod: "delivery",
    });

    expect(result.discountedSubtotalCents).toBe(3000);
    expect(result.belowMinimum).toBe(false);
  });

  test("Test 19: pro member gets no discount on delivery orders", () => {
    const result = calculateDeliveryFees({
      cartItems: [item({ unitPriceCents: 10000, quantity: 1 })],
      distanceResult: distance(8, 35),
      pricingConfig,
      truckTypes,
      combineLoads: false,
      deliveryMethod: "delivery",
      customerType: "pro",
    });

    expect(result.proDiscountCents).toBe(0);
    expect(result.discountedSubtotalCents).toBe(10000);
  });

  test("Test 20: pro member pickup gets 5% material discount", () => {
    const result = calculateDeliveryFees({
      cartItems: [item({ unitPriceCents: 10000, quantity: 1 })],
      distanceResult: null,
      pricingConfig,
      truckTypes,
      combineLoads: false,
      deliveryMethod: "pickup",
      customerType: "pro",
    });

    expect(result.proDiscountCents).toBe(500);
    expect(result.discountedSubtotalCents).toBe(9500);
  });

  test("Test 21: credit card surcharge is 3% of subtotal + delivery + tax", () => {
    const result = calculateDeliveryFees({
      cartItems: [item({ unitPriceCents: 10000, quantity: 1 })],
      distanceResult: distance(8, 35),
      pricingConfig,
      truckTypes,
      combineLoads: false,
      deliveryMethod: "delivery",
    });

    const expectedTax = Math.round((10000 + 6000) * 0.0875);
    const expectedSurcharge = Math.round((10000 + 6000 + expectedTax) * 0.03);

    expect(result.taxCents).toBe(expectedTax);
    expect(result.ccSurchargeCents).toBe(expectedSurcharge);
  });

  test("Test 23: repeated calculation is idempotent", () => {
    const input = {
      cartItems: [item({ quantity: 8 }), item({ id: "m1", quantity: 2, materialClass: "mulch" })],
      distanceResult: distance(12, 48),
      pricingConfig,
      truckTypes,
      combineLoads: true,
      deliveryMethod: "delivery" as const,
    };

    const first = calculateDeliveryFees(input);
    const second = calculateDeliveryFees(input);

    expect(second).toEqual(first);
  });
});

describe("calculateDeliveryFeesWithCache", () => {
  test("Test 22: cache hit returns fee without calling Maps fetch", async () => {
    const fetchDistance = jest.fn();
    const cache = {
      getByAddressHash: jest.fn(async () => ({
        addressHash: "abc123",
        distanceMeters: milesToMeters(8),
        durationSeconds: 35 * 60,
        firstLoadFeeCents: 6000,
        additionalLoadFeeCents: 4500,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      })),
      set: jest.fn(async () => {}),
    };

    const result = await calculateDeliveryFeesWithCache({
      cartItems: [item({ quantity: 8 })],
      pricingConfig,
      truckTypes,
      combineLoads: false,
      deliveryMethod: "delivery",
      addressHash: "abc123",
      cache,
      fetchDistance,
    });

    expect(result.firstLoadFeeCents).toBe(6000);
    expect(fetchDistance).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  test("Test 24: Google Maps API error returns blocked error state", async () => {
    const result = await calculateDeliveryFeesWithCache({
      cartItems: [item({ quantity: 8 })],
      pricingConfig,
      truckTypes,
      combineLoads: false,
      deliveryMethod: "delivery",
      fetchDistance: async () => {
        throw new Error("Google Maps failed");
      },
    });

    expect(result.error).toBe("Unable to calculate delivery from Google Maps.");
    expect(result.checkoutBlocked).toBe(true);
  });
});
