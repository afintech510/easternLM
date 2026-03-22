import type {
  CartItem,
  CustomerType,
  DeliveryCalculationResult,
  DeliveryPricingConfig,
  DistanceMatrixResult,
  TruckType,
} from "@/lib/delivery";

export type DeliveryAddress = {
  fullAddress: string;
  zip: string;
};

export type DeliveryAccessInfo = {
  lowWires: boolean;
  narrowDriveway: boolean;
  softGround: boolean;
  gated: boolean;
  steep: boolean;
  notes: string;
};

export type CustomerInfo = {
  fullName: string;
  email: string;
  phone: string;
  smsOptIn: boolean;
};

export type CartStoreState = {
  items: CartItem[];
  deliveryAddress: DeliveryAddress | null;
  deliveryMethod: "pickup" | "delivery";
  promoCode: string;
  combineLoads: boolean;
  customerType: CustomerType;
  customerInfo: CustomerInfo;
  deliveryCalculation: DeliveryCalculationResult | null;
  deliveryPricingConfig: DeliveryPricingConfig;
  truckTypes: TruckType[];
  distanceResult: DistanceMatrixResult | null;
  accessConstraints: DeliveryAccessInfo;
  isCalculating: boolean;
  isConfigLoading: boolean;
  error: string | null;
};
