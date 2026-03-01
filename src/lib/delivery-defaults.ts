import type { DeliveryPricingConfig, TruckType } from "@/lib/delivery";

export const defaultDeliveryPricingConfig: DeliveryPricingConfig = {
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

export const defaultTruckTypes: TruckType[] = [
  { name: "Small Dump", capacityMulch: 7, capacityDefault: 5, sortOrder: 1 },
  { name: "Medium Dump", capacityMulch: 10, capacityDefault: 10, sortOrder: 2 },
  { name: "Tri-Axle", capacityMulch: 20, capacityDefault: 20, sortOrder: 3 },
];
