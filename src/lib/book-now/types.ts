/** Types for the instant-book landscape services feature */

export type ServicePackage = {
  name: string;
  price_cents: number;
  unit: "flat" | "per_unit" | "quote";
  description?: string;
};

export type InstantBookService = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  includes: string[];
  icon: string | null;
  category: string;
  packages: ServicePackage[];
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  season_start_month: number | null;
  season_end_month: number | null;
  notes: string | null;
};

export type CartItem = {
  serviceId: string;
  serviceSlug: string;
  serviceName: string;
  packageName: string;
  packageUnit: string;
  quantity: number; // for per_unit packages (e.g., yards of topsoil)
  priceCents: number; // unit price
  lineTotalCents: number; // priceCents * quantity
};

export type BookingRequest = {
  items: CartItem[];
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  address: string;
  preferredDate: string;
  notes?: string;
  paymentMethodId: string; // from Stripe Elements
  clientTotalCents: number;
};
