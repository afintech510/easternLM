"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Zustand store for the /app bulk ordering experience.
 * Completely separate from the main site's cartStore.
 * Spec Section 9: Order state management.
 */

export interface BulkOrderItem {
  slug: string;
  name: string;
  qty: number;
  priceCents: number; // per cu. yard at this qty (recalculated on qty change)
  options: {
    size?: string;
    premium?: boolean;
    crushed?: boolean;
    application?: string;
    depth: number;
  };
}

interface BulkOrderState {
  items: BulkOrderItem[];
  deliveryMethod: "delivery" | "pickup";
  deliveryAddress: string;
  deliveryDate: string;
  phone: string;
  instructions: string;
  accessConstraints: Record<string, boolean>;
}

interface BulkOrderActions {
  addItem: (item: BulkOrderItem) => void;
  updateItem: (slug: string, updates: Partial<BulkOrderItem>) => void;
  removeItem: (slug: string) => void;
  clearOrder: () => void;
  setDeliveryDetails: (details: Partial<BulkOrderState>) => void;
}

const initialState: BulkOrderState = {
  items: [],
  deliveryMethod: "delivery",
  deliveryAddress: "",
  deliveryDate: "",
  phone: "",
  instructions: "",
  accessConstraints: {},
};

export const useBulkOrderStore = create<BulkOrderState & BulkOrderActions>()(
  persist(
    (set) => ({
      ...initialState,

      addItem: (item) =>
        set((state) => {
          const existing = state.items.findIndex((i) => i.slug === item.slug);
          if (existing >= 0) {
            const items = [...state.items];
            items[existing] = { ...items[existing], ...item };
            return { items };
          }
          return { items: [...state.items, item] };
        }),

      updateItem: (slug, updates) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.slug === slug ? { ...i, ...updates } : i
          ),
        })),

      removeItem: (slug) =>
        set((state) => ({
          items: state.items.filter((i) => i.slug !== slug),
        })),

      clearOrder: () => set(initialState),

      setDeliveryDetails: (details) => set(details),
    }),
    {
      name: "easternlm-bulk-order",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        deliveryMethod: state.deliveryMethod,
        deliveryAddress: state.deliveryAddress,
        deliveryDate: state.deliveryDate,
        phone: state.phone,
        instructions: state.instructions,
        accessConstraints: state.accessConstraints,
      }),
    }
  )
);
