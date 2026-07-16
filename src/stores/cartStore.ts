"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { calculateDeliveryFees, type CartItem } from "@/lib/delivery";
import { defaultDeliveryPricingConfig, defaultTruckTypes } from "@/lib/delivery-defaults";
import type { CartStoreState, CustomerInfo, DeliveryAccessInfo, DeliveryAddress } from "@/types/cart";

type CartStoreActions = {
  loadDeliveryConfig: () => Promise<void>;
  addItem: (item: CartItem) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  setDeliveryAddress: (address: DeliveryAddress) => Promise<void>;
  toggleDeliveryMethod: (method?: "pickup" | "delivery") => Promise<void>;
  toggleCombineLoads: () => Promise<void>;
  applyPromoCode: (code: string) => Promise<void>;
  setAccessConstraints: (constraints: Partial<DeliveryAccessInfo>) => void;
  setDeliveryDate: (date: string) => void;
  setDeliveryTimeWindow: (tw: string) => void;
  setCustomerInfo: (info: Partial<CustomerInfo>) => void;
  swapItems: (indexA: number, indexB: number) => void;
  recalculateDelivery: () => Promise<void>;
  clearError: () => void;
  clearCart: () => void;
};

type CartStore = CartStoreState & CartStoreActions;

const defaultAccessConstraints: DeliveryAccessInfo = {
  lowWires: false,
  narrowDriveway: false,
  softGround: false,
  gated: false,
  steep: false,
  notes: "",
};

async function fetchDistanceForAddress(address: string) {
  const response = await fetch("/api/delivery/distance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Unable to calculate delivery distance.");
  }

  const body = (await response.json()) as {
    distanceMeters: number;
    durationSeconds: number;
  };

  return {
    distanceMeters: body.distanceMeters,
    durationSeconds: body.durationSeconds,
  };
}

function upsertCartItem(items: CartItem[], nextItem: CartItem) {
  const found = items.find((item) => item.id === nextItem.id);
  if (!found) {
    return [...items, nextItem];
  }

  return items.map((item) =>
    item.id === nextItem.id
      ? {
          ...item,
          quantity: Number((item.quantity + nextItem.quantity).toFixed(2)),
          unitPriceCents: nextItem.unitPriceCents,
          materialClass: nextItem.materialClass,
          deliveryType: nextItem.deliveryType,
          fulfillmentMethod: nextItem.fulfillmentMethod,
        }
      : item,
  );
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      deliveryAddress: null,
      deliveryMethod: "delivery",
      promoCode: "",
      combineLoads: false,
      customerType: "standard",
      customerInfo: { fullName: "", email: "", phone: "", smsOptIn: false },
      deliveryCalculation: null,
      deliveryPricingConfig: defaultDeliveryPricingConfig,
      truckTypes: defaultTruckTypes,
      distanceResult: null,
      accessConstraints: defaultAccessConstraints,
      deliveryDate: "",
      deliveryTimeWindow: "flexible",
      onlineOrderFeeCents: 0,
      isCalculating: false,
      isConfigLoading: false,
      error: null,

      loadDeliveryConfig: async () => {
        set({ isConfigLoading: true });
        try {
          const response = await fetch("/api/delivery/config", { cache: "no-store" });
          if (!response.ok) {
            throw new Error("Failed to load delivery configuration.");
          }

          const body = (await response.json()) as {
            pricingConfig: CartStoreState["deliveryPricingConfig"];
            truckTypes: CartStoreState["truckTypes"];
            onlineOrderFeeCents?: number;
          };

          set({
            deliveryPricingConfig: body.pricingConfig,
            truckTypes: body.truckTypes,
            onlineOrderFeeCents: body.onlineOrderFeeCents ?? 0,
            isConfigLoading: false,
            error: null,
          });
          await get().recalculateDelivery();
        } catch (error) {
          set({
            isConfigLoading: false,
            error: error instanceof Error ? error.message : "Unable to load delivery configuration.",
          });
        }
      },

      addItem: async (item) => {
        set((state) => ({ items: upsertCartItem(state.items, item), error: null }));
        try {
          await get().recalculateDelivery();
        } catch {
          // Item is already added — don't let delivery calc errors block the cart
          set({ isCalculating: false });
        }
      },

      removeItem: async (itemId) => {
        set((state) => ({ items: state.items.filter((item) => item.id !== itemId), error: null }));
        try {
          await get().recalculateDelivery();
        } catch {
          set({ isCalculating: false });
        }
      },

      updateQuantity: async (itemId, quantity) => {
        if (quantity <= 0) {
          await get().removeItem(itemId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
          error: null,
        }));
        try {
          await get().recalculateDelivery();
        } catch {
          set({ isCalculating: false });
        }
      },

      setDeliveryAddress: async (address) => {
        set({ deliveryAddress: address, isCalculating: true, error: null });
        try {
          const distanceResult = await fetchDistanceForAddress(address.fullAddress);
          set({ distanceResult });
          await get().recalculateDelivery();
        } catch (error) {
          set({
            distanceResult: null,
            isCalculating: false,
            error: error instanceof Error ? error.message : "Failed to set delivery address.",
          });
        }
      },

      toggleDeliveryMethod: async (method) => {
        set((state) => ({
          deliveryMethod: method ?? (state.deliveryMethod === "delivery" ? "pickup" : "delivery"),
          error: null,
        }));
        try {
          await get().recalculateDelivery();
        } catch {
          set({ isCalculating: false });
        }
      },

      toggleCombineLoads: async () => {
        set((state) => ({ combineLoads: !state.combineLoads, error: null }));
        try {
          await get().recalculateDelivery();
        } catch {
          set({ isCalculating: false });
        }
      },

      applyPromoCode: async (code) => {
        const normalized = code.trim().toUpperCase();

        if (!normalized) {
          set({ promoCode: "", customerType: "standard", error: null });
          await get().recalculateDelivery();
          return;
        }

        // Validate against database
        try {
          const res = await fetch("/api/promo/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: normalized }),
          });
          const data = await res.json();

          if (!data.valid) {
            set({ error: data.error || "Promo code not recognized.", promoCode: normalized, customerType: "standard" });
            await get().recalculateDelivery();
            return;
          }

          set({ promoCode: normalized, customerType: "pro", error: null });
          await get().recalculateDelivery();

          // Pickup-only restriction only applies to contractor pro codes, not general promos
          const isProContractorCode = ["PRO", "PRO5", "PROMEMBER"].includes(normalized);
          const { deliveryMethod, deliveryPricingConfig } = get();
          if (isProContractorCode && deliveryMethod === "delivery" && deliveryPricingConfig.proDiscountPickupOnly) {
            set({ error: "Pro contractor discount applies to pickup orders only." });
          }
        } catch {
          set({ error: "Could not validate promo code.", promoCode: normalized, customerType: "standard" });
        }
      },

      setAccessConstraints: (constraints) => {
        set((state) => ({
          accessConstraints: { ...state.accessConstraints, ...constraints },
        }));
      },

      setDeliveryDate: (date) => {
        set({ deliveryDate: date });
      },

      setDeliveryTimeWindow: (tw) => {
        set({ deliveryTimeWindow: tw });
      },

      setCustomerInfo: (info) => {
        set((state) => ({
          customerInfo: { ...state.customerInfo, ...info },
        }));
      },

      swapItems: (indexA: number, indexB: number) => {
        set((state) => {
          const items = [...state.items];
          if (indexA < 0 || indexB < 0 || indexA >= items.length || indexB >= items.length) return state;
          [items[indexA], items[indexB]] = [items[indexB], items[indexA]];
          return { items };
        });
      },

      recalculateDelivery: async () => {
        const {
          items,
          deliveryMethod,
          deliveryAddress,
          distanceResult,
          deliveryPricingConfig,
          truckTypes,
          combineLoads,
          customerType,
        } = get();

        set({ isCalculating: true });

        if (items.length === 0) {
          set({ deliveryCalculation: null, isCalculating: false, error: null });
          return;
        }

        if (deliveryMethod === "delivery" && !deliveryAddress) {
          set({
            deliveryCalculation: null,
            isCalculating: false,
            error: "Enter a delivery address to calculate fees.",
          });
          return;
        }

        if (deliveryMethod === "delivery" && !distanceResult) {
          set({
            deliveryCalculation: null,
            isCalculating: false,
            error: "Delivery distance is missing. Please re-enter your address.",
          });
          return;
        }

        try {
          const calculation = calculateDeliveryFees({
            cartItems: items,
            distanceResult: deliveryMethod === "delivery" ? distanceResult : null,
            pricingConfig: deliveryPricingConfig,
            truckTypes,
            combineLoads,
            deliveryMethod,
            customerType,
          });

          set({
            deliveryCalculation: calculation,
            isCalculating: false,
            error: calculation.error ?? null,
          });
        } catch {
          set({
            deliveryCalculation: null,
            isCalculating: false,
            error: "Unable to calculate delivery fees.",
          });
        }
      },

      clearError: () => set({ error: null }),

      clearCart: () => set({
        items: [],
        deliveryAddress: null,
        deliveryCalculation: null,
        distanceResult: null,
        promoCode: "",
        customerInfo: { fullName: "", email: "", phone: "", smsOptIn: false },
        error: null,
      }),
    }),
    {
      name: "easternlm-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        deliveryAddress: state.deliveryAddress,
        deliveryMethod: state.deliveryMethod,
        promoCode: state.promoCode,
        combineLoads: state.combineLoads,
        customerType: state.customerType,
        accessConstraints: state.accessConstraints,
        deliveryDate: state.deliveryDate,
        deliveryTimeWindow: state.deliveryTimeWindow,
        customerInfo: state.customerInfo,
      }),
    },
  ),
);

export const useCartItemCount = () =>
  useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));

/**
 * Returns true only after Zustand persist has rehydrated from localStorage.
 * Use this in components that conditionally render DOM based on cart state
 * to prevent React hydration mismatches (server renders empty, client has items).
 */
export function useCartHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // Zustand persist rehydrates synchronously on mount, so by the time
    // this effect runs the store already has the persisted values.
    setHydrated(true);
  }, []);
  return hydrated;
}
