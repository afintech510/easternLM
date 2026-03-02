import type { Database } from "@/types/database";
import type { DeliveryPricingConfig, TruckType } from "@/lib/delivery";
import { defaultDeliveryPricingConfig, defaultTruckTypes } from "@/lib/delivery-defaults";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type SiteSettingsRow = Database["public"]["Tables"]["site_settings"]["Row"];
type TruckTypeRow = Database["public"]["Tables"]["truck_types"]["Row"];

function mapSiteSettingsToPricingConfig(row: SiteSettingsRow): DeliveryPricingConfig {
  return {
    milesPerGallon: Number(row.miles_per_gallon),
    fuelPricePerGallon: Number(row.fuel_price_per_gallon),
    hourlyLaborRate: Number(row.hourly_labor_rate),
    profitMultiplier: Number(row.profit_multiplier),
    roundToNearest: row.round_to_nearest,
    minimumDeliveryFee: row.minimum_delivery_fee_cents / 100,
    additionalLoadDiscount: Number(row.additional_load_discount),
    minimumOrderCents: row.minimum_order_cents,
    localRadiusMiles: Number(row.local_radius_miles),
    maxServiceRadiusMiles: Number(row.max_service_radius_miles),
    taxRate: Number(row.tax_rate),
    ccSurchargeRate: Number(row.cc_surcharge_rate),
    proDiscountRate: Number(row.pro_discount_rate),
    proDiscountPickupOnly: row.pro_discount_pickup_only,
  };
}

function mapTruckRowToTruckType(row: TruckTypeRow): TruckType {
  return {
    name: row.name,
    capacityMulch: Number(row.capacity_mulch),
    capacityDefault: Number(row.capacity_default),
    sortOrder: row.sort_order,
  };
}

export async function getDeliveryRuntimeConfig() {
  const supabase = getSupabaseServerClient();

  const [settingsResult, trucksResult] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("truck_types").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
  ]);

  const pricingConfig =
    settingsResult.error || !settingsResult.data
      ? defaultDeliveryPricingConfig
      : mapSiteSettingsToPricingConfig(settingsResult.data);

  const truckTypes =
    trucksResult.error || !trucksResult.data?.length
      ? defaultTruckTypes
      : trucksResult.data.map(mapTruckRowToTruckType);

  const originAddress =
    settingsResult.error || !settingsResult.data?.origin_address
      ? "110 Frowein Road, Center Moriches, NY 11934"
      : settingsResult.data.origin_address;

  return {
    pricingConfig,
    truckTypes,
    originAddress,
  };
}
