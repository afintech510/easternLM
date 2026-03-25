"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Camera, CheckCircle, Loader2, Truck, DollarSign } from "lucide-react";

type OrderData = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  delivery_address: string | null;
  delivery_date: string | null;
  delivery_time_window: string | null;
  grand_total_cents: number;
  payment_method: string;
  status: string;
  items: Array<{ product_name: string; quantity: number; unit: string }>;
};

const TW: Record<string, string> = {
  morning: "Morning (7 AM – 10 AM)",
  midday: "Midday (10 AM – 1 PM)",
  afternoon: "Afternoon (1 PM – 5 PM)",
  flexible: "Flexible (7 AM – 5 PM)",
};

export default function DeliveryConfirmPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetch(`/api/delivery/confirm/${orderId}`)
      .then((r) => r.json())
      .then((d) => { if (d.order) setOrder(d.order); })
      .finally(() => setLoading(false));
  }, [orderId]);

  async function handlePhoto(capture: "environment" | "user") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = capture;
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("orderId", orderId);
      const res = await fetch("/api/delivery/confirm/upload-photo", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setPhotos((prev) => [...prev, data.url]);
      setUploading(false);
    };
    input.click();
  }

  async function handleConfirm() {
    setConfirming(true);
    await fetch(`/api/delivery/confirm/${orderId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photos, cashCollected: order?.payment_method === "cod" }),
    });
    setConfirmed(true);
    setConfirming(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="size-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 text-center">
        <p className="text-zinc-500">Order not found.</p>
      </div>
    );
  }

  if (confirmed || order.status === "delivered") {
    return (
      <div className="min-h-screen bg-zinc-50 p-6">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="size-9 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900">Delivery Confirmed</h1>
          <p className="mt-2 text-sm text-zinc-500">Thank you. This delivery has been recorded.</p>
        </div>
      </div>
    );
  }

  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;
  const isCod = order.payment_method === "cod";
  const materialItems = order.items.filter((i) => !i.product_name.startsWith("Delivery Load"));

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-primary px-5 py-4 text-center text-white">
        <Image src="/logo-white.png" alt="Eastern LM" width={140} height={36} className="mx-auto h-8 w-auto" />
        <p className="mt-2 text-sm font-semibold">Delivery Confirmation</p>
      </header>

      <div className="mx-auto max-w-md px-4 py-5 space-y-4">
        {/* Order info */}
        <div className="rounded-xl bg-white p-4 shadow-sm space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Order #{order.id.slice(0, 8).toUpperCase()}</p>
          <p className="font-semibold text-zinc-900">{order.customer_name}</p>
          {order.customer_phone && <p className="text-sm text-zinc-600">{order.customer_phone}</p>}
          {order.delivery_address && (
            <p className="text-sm font-medium text-zinc-800">{order.delivery_address.replace(/,?\s*(USA|US)\s*$/i, "")}</p>
          )}
          {order.delivery_date && (
            <p className="text-xs text-zinc-500">
              {new Date(order.delivery_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              {order.delivery_time_window ? ` · ${TW[order.delivery_time_window] ?? order.delivery_time_window}` : ""}
            </p>
          )}
        </div>

        {/* Materials */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Materials</p>
          {materialItems.map((item, i) => (
            <p key={i} className="text-sm font-medium text-zinc-800">
              {item.quantity} {item.unit === "unit" ? "cu. yards" : item.unit} {item.product_name}
            </p>
          ))}
        </div>

        {/* Photos */}
        <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Delivery Photos</p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePhoto("user")}
              disabled={uploading}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 py-4 text-sm text-zinc-600 hover:border-accent hover:text-accent"
            >
              <Camera className="size-5" /> {uploading ? "Uploading..." : "Driver Selfie"}
            </button>
            <button
              onClick={() => handlePhoto("environment")}
              disabled={uploading}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 py-4 text-sm text-zinc-600 hover:border-accent hover:text-accent"
            >
              <Camera className="size-5" /> {uploading ? "Uploading..." : "Material Photo"}
            </button>
          </div>
          {photos.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {photos.map((url, i) => (
                <img key={i} src={url} alt={`Photo ${i + 1}`} className="h-20 w-20 rounded-lg object-cover" />
              ))}
            </div>
          )}
        </div>

        {/* COD Collection */}
        {isCod && (
          <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-5 text-center">
            <DollarSign className="mx-auto size-8 text-amber-600" />
            <p className="mt-1 text-lg font-bold text-amber-800">Collect Cash on Delivery</p>
            <p className="text-2xl font-bold text-amber-900 mt-1">{fmt(order.grand_total_cents)}</p>
          </div>
        )}

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={confirming || photos.length < 1}
          className="w-full rounded-xl bg-green-600 py-4 text-base font-bold text-white hover:bg-green-500 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {confirming ? <Loader2 className="size-5 animate-spin" /> : <Truck className="size-5" />}
          {isCod ? "Cash Received — Confirm Delivery" : "Confirm Delivery"}
        </button>
        {photos.length < 1 && (
          <p className="text-center text-xs text-zinc-400">Take at least 1 photo to confirm delivery</p>
        )}
      </div>
    </div>
  );
}
