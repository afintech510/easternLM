"use client";

import { useMemo } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { formatUsd } from "@/lib/format";

type LineItem = {
  id: string;
  product: { id: string; name: string; unit_label: string; delivery_type: string };
  quantity: number;
  price_cents: number;
  note?: string;
};

const TAX_RATE = 0.0875;
const CC_SURCHARGE = 0.035;

interface Props {
  items: LineItem[];
  onUpdateQty: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  deliveryFeeCents: number;
  taxExempt: boolean;
  proDiscount: boolean;
  discountAmountCents: number;
  customerName: string;
  // Payment handlers
  onPayCard: () => void;
  onPayCash: () => void;
  onPayCod: () => void;
  onPayAccount?: () => void;
  onHoldOrder: () => void;
  onQuote: () => void;
  onPaylink: () => void;
  onLicensePhoto: () => void;
  processing: boolean;
  isChargeAccount?: boolean;
  terminalStatus: string;
}

export function POSCartPanel({
  items, onUpdateQty, onRemoveItem, deliveryFeeCents, taxExempt, proDiscount,
  discountAmountCents, customerName, onPayCard, onPayCash, onPayCod,
  onPayAccount, onHoldOrder, onQuote, onPaylink, onLicensePhoto,
  processing, isChargeAccount, terminalStatus,
}: Props) {
  const subtotalCents = useMemo(
    () => items.reduce((s, i) => s + i.quantity * i.price_cents, 0),
    [items],
  );

  const proDiscountCents = proDiscount ? Math.round(subtotalCents * 0.05) : 0;
  const afterDiscount = subtotalCents - proDiscountCents - discountAmountCents;
  const withDelivery = afterDiscount + deliveryFeeCents;
  const taxCents = taxExempt ? 0 : Math.round(withDelivery * TAX_RATE);
  const cashTotalCents = withDelivery + taxCents;
  const ccFeeCents = Math.round(cashTotalCents * CC_SURCHARGE);
  const cardTotalCents = cashTotalCents + ccFeeCents;

  return (
    <div className="flex h-full flex-col">
      {/* Customer header — fixed */}
      <div className="shrink-0 border-b border-zinc-800 px-4 py-2.5">
        <p className="text-sm font-medium text-zinc-300">{customerName}</p>
        <p className="text-[11px] text-zinc-600">{items.length} item{items.length !== 1 ? "s" : ""} in cart</p>
      </div>

      {/* Cart items — scrollable */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-700">
            Tap products to add to cart
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">{item.product.name}</p>
                  <p className="text-[11px] text-zinc-500">
                    {formatUsd(item.price_cents)}/{item.product.unit_label}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onUpdateQty(item.id, -1)}
                    className="size-7 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 flex items-center justify-center"
                  >
                    <Minus className="size-3" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold text-zinc-200">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQty(item.id, 1)}
                    className="size-7 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 flex items-center justify-center"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
                <span className="w-16 text-right text-sm font-semibold text-zinc-200">
                  {formatUsd(item.quantity * item.price_cents)}
                </span>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="size-7 rounded text-zinc-600 hover:text-red-400 flex items-center justify-center"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totals — fixed */}
      <div className="shrink-0 border-t border-zinc-800 px-4 py-3 space-y-1 text-sm">
        <div className="flex justify-between text-zinc-400">
          <span>Subtotal</span>
          <span>{formatUsd(subtotalCents)}</span>
        </div>
        {proDiscountCents > 0 && (
          <div className="flex justify-between text-green-500">
            <span>Pro discount (5%)</span>
            <span>-{formatUsd(proDiscountCents)}</span>
          </div>
        )}
        {discountAmountCents > 0 && (
          <div className="flex justify-between text-green-500">
            <span>Discount</span>
            <span>-{formatUsd(discountAmountCents)}</span>
          </div>
        )}
        {deliveryFeeCents > 0 && (
          <div className="flex justify-between text-zinc-400">
            <span>Delivery</span>
            <span>{formatUsd(deliveryFeeCents)}</span>
          </div>
        )}
        {!taxExempt && (
          <div className="flex justify-between text-zinc-400">
            <span>Tax (8.75%)</span>
            <span>{formatUsd(taxCents)}</span>
          </div>
        )}
        <div className="flex justify-between pt-1 border-t border-zinc-700 text-base font-bold text-zinc-100">
          <span>Cash Total</span>
          <span>{formatUsd(cashTotalCents)}</span>
        </div>
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Card Total (+3.5% CC fee)</span>
          <span>{formatUsd(cardTotalCents)}</span>
        </div>
      </div>

      {/* Payment buttons — fixed */}
      <div className="shrink-0 border-t border-zinc-800 p-3 space-y-2">
        <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-500">
          <span className={`size-2 rounded-full ${terminalStatus === "disconnected" ? "bg-red-500" : "bg-green-500"}`} />
          {terminalStatus === "simulated" ? "Simulated Reader" : terminalStatus === "connected" ? "Reader Connected" : "No Reader"}
        </div>

        <div className={`grid gap-2 ${isChargeAccount ? "grid-cols-2" : "grid-cols-3"}`}>
          <button
            onClick={onPayCard}
            disabled={items.length === 0 || processing || terminalStatus === "disconnected"}
            className="rounded-lg bg-green-700 py-3 text-sm font-bold text-white hover:bg-green-600 disabled:opacity-30 active:bg-green-800 transition-colors"
          >
            CARD<br /><span className="text-xs font-normal opacity-70">{formatUsd(cardTotalCents)}</span>
          </button>
          <button
            onClick={onPayCash}
            disabled={items.length === 0 || processing}
            className="rounded-lg bg-blue-700 py-3 text-sm font-bold text-white hover:bg-blue-600 disabled:opacity-30 active:bg-blue-800 transition-colors"
          >
            CASH<br /><span className="text-xs font-normal opacity-70">{formatUsd(cashTotalCents)}</span>
          </button>
          {!isChargeAccount && (
            <button
              onClick={onPayCod}
              disabled={items.length === 0 || processing}
              className="rounded-lg bg-orange-700 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-30 active:bg-orange-800 transition-colors"
            >
              COD<br /><span className="text-xs font-normal opacity-70">{formatUsd(cashTotalCents)}</span>
            </button>
          )}
        </div>

        {isChargeAccount && onPayAccount && (
          <button
            onClick={onPayAccount}
            disabled={items.length === 0 || processing}
            className="w-full rounded-lg bg-indigo-700 py-2.5 text-sm font-bold text-white hover:bg-indigo-600 disabled:opacity-30 transition-colors"
          >
            CHARGE ACCOUNT — {formatUsd(cashTotalCents)}
          </button>
        )}

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={onQuote}
            className="rounded-lg bg-teal-800 py-2 text-xs font-bold text-teal-100 hover:bg-teal-700 transition-colors"
          >
            QUOTE
          </button>
          <button
            onClick={onHoldOrder}
            disabled={items.length === 0}
            className="rounded-lg bg-zinc-800 py-2 text-xs text-zinc-400 hover:bg-zinc-700 disabled:opacity-30 transition-colors"
          >
            HOLD
          </button>
          <button
            onClick={onPaylink}
            disabled={items.length === 0 || processing}
            className="rounded-lg bg-purple-800 py-2 text-xs text-purple-200 hover:bg-purple-700 disabled:opacity-30 transition-colors"
          >
            PAYLINK
          </button>
        </div>

        <button
          onClick={onLicensePhoto}
          className="w-full rounded-lg bg-zinc-800/50 py-1.5 text-[11px] text-zinc-500 hover:bg-zinc-800 transition-colors"
        >
          License Photo
        </button>
      </div>
    </div>
  );
}
