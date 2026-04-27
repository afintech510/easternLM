import { z } from "zod";

// ── Products ────────────────────────────────────────────────

export const productSchema = z.object({
  name: z.string().min(2, "Name is required"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
  category_id: z.string().uuid("Select a category"),
  delivery_type: z.enum(["bulk", "non-bulk"]),
  material_class: z.enum(["mulch", "default"]),
  price_per_unit_cents: z.number().int().nonnegative("Price must be non-negative"),
  web_price_per_unit_cents: z.number().int().nonnegative().nullable().optional(),
  unit: z.string().min(1),
  unit_display: z.string().min(1),
  min_qty: z.number().positive(),
  max_qty: z.number().positive(),
  step_qty: z.number().positive(),
  description: z.string(),
  images: z.array(z.string()),
  recommended_uses: z.array(z.string()),
  pairs_well_with: z.array(z.string()),
  pallet_qty: z.number().int().nonnegative().nullable().optional(),
  pallet_price_cents: z.number().int().nonnegative().nullable().optional(),
  half_yard_enabled: z.boolean().optional(),
  half_yard_adder_cents: z.number().int().nonnegative().optional(),
  is_taxable: z.boolean(),
  is_active: z.boolean(),
  visible_web: z.boolean(),
  visible_pos: z.boolean(),
  sort_order: z.number().int(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

// ── Categories ──────────────────────────────────────────────

export const categorySchema = z.object({
  name: z.string().min(2, "Name is required"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  image: z.string().nullable(),
  is_active: z.boolean(),
  sort_order: z.number().int(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

// ── Truck Types ─────────────────────────────────────────────

export const truckTypeSchema = z.object({
  name: z.string().min(2, "Name is required"),
  capacity_mulch: z.number().positive("Must be positive"),
  capacity_default: z.number().positive("Must be positive"),
  sort_order: z.number().int(),
  is_active: z.boolean(),
});

export type TruckTypeFormValues = z.infer<typeof truckTypeSchema>;

// ── Site Settings ───────────────────────────────────────────

export const siteSettingsSchema = z.object({
  origin_address: z.string().min(5),
  miles_per_gallon: z.number().positive(),
  fuel_price_per_gallon: z.number().positive(),
  hourly_labor_rate: z.number().positive(),
  dump_time_buffer_minutes: z.number().int().nonnegative(),
  profit_multiplier: z.number().positive(),
  round_to_nearest: z.number().int().positive(),
  minimum_delivery_fee_cents: z.number().int().nonnegative(),
  additional_load_discount: z.number().min(0).max(1),
  minimum_order_cents: z.number().int().nonnegative(),
  local_radius_miles: z.number().positive(),
  max_service_radius_miles: z.number().positive(),
  tax_rate: z.number().min(0).max(1),
  cc_surcharge_rate: z.number().min(0).max(1),
  same_day_cutoff_hour: z.number().int().min(0).max(23),
  timezone: z.string().min(1),
  operating_days: z.array(z.string()),
  blackout_dates: z.array(z.string()),
  max_loads_per_day_per_address: z.number().int().positive(),
  pro_discount_rate: z.number().min(0).max(1),
  pro_discount_pickup_only: z.boolean(),
  online_order_fee_cents: z.number().int().nonnegative(),
});

export type SiteSettingsFormValues = z.infer<typeof siteSettingsSchema>;

// ── Gallery Projects ────────────────────────────────────────

export const galleryProjectSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string(),
  images: z.array(z.string()),
  town_tags: z.array(z.string()),
  service_type: z.string().min(1, "Service type is required"),
  before_after: z.boolean(),
  is_featured: z.boolean(),
});

export type GalleryProjectFormValues = z.infer<typeof galleryProjectSchema>;

// ── Order Status ────────────────────────────────────────────

export const orderStatusSchema = z.object({
  status: z.enum(["pending", "paid", "processing", "scheduled", "delivered", "cancelled"]),
});

export type OrderStatusFormValues = z.infer<typeof orderStatusSchema>;
