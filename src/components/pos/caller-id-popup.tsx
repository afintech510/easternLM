"use client";

import { useEffect, useState, useCallback } from "react";
import { Phone, X, User, ShoppingCart, MapPin, Clock } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatUsd } from "@/lib/format";

interface IncomingCall {
  id: string;
  caller_phone: string;
  caller_digits: string;
  customer_id: string | null;
  customer_data: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    company_name: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    total_orders: number;
    total_spent_cents: number;
    tags: string[];
    is_charge_account?: boolean;
    charge_account_name?: string | null;
  } | null;
  created_at: string;
}

interface CallerIdPopupProps {
  onAttachCustomer: (customer: {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
  }) => void;
}

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "").slice(-10);
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return phone;
}

export function CallerIdPopup({ onAttachCustomer }: CallerIdPopupProps) {
  const [calls, setCalls] = useState<IncomingCall[]>([]);

  const dismissCall = useCallback((id: string) => {
    setCalls((prev) => prev.filter((c) => c.id !== id));
    // Mark as dismissed in DB
    const supabase = getSupabaseBrowserClient();
    (supabase as any).from("incoming_calls").update({ dismissed: true }).eq("id", id).then(() => {});
  }, []);

  // Auto-dismiss after 60 seconds
  useEffect(() => {
    const timers = calls.map((call) => {
      const age = Date.now() - new Date(call.created_at).getTime();
      const remaining = Math.max(60000 - age, 1000);
      return setTimeout(() => dismissCall(call.id), remaining);
    });
    return () => timers.forEach(clearTimeout);
  }, [calls, dismissCall]);

  // Subscribe to realtime incoming_calls
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("incoming-calls")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "incoming_calls" },
        (payload: any) => {
          const call = payload.new as IncomingCall;
          setCalls((prev) => [call, ...prev.slice(0, 4)]); // Max 5 visible

          // Play notification sound
          try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800;
            gain.gain.value = 0.15;
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
            setTimeout(() => {
              const osc2 = ctx.createOscillator();
              osc2.connect(gain);
              osc2.frequency.value = 1000;
              osc2.start();
              osc2.stop(ctx.currentTime + 0.15);
            }, 200);
          } catch {}
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (calls.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-[100] flex flex-col gap-2" style={{ maxWidth: 380 }}>
      {calls.map((call) => {
        const c = call.customer_data;
        const name = c
          ? [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || "Customer"
          : "Unknown Caller";

        return (
          <div
            key={call.id}
            className="animate-in slide-in-from-right rounded-xl border border-green-600/40 bg-zinc-900 shadow-2xl shadow-green-900/20"
          >
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2.5">
              <div className="flex size-8 items-center justify-center rounded-full bg-green-600 animate-pulse">
                <Phone className="size-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-green-400">Incoming Call</p>
                <p className="text-sm font-semibold text-zinc-100">{formatPhone(call.caller_phone)}</p>
              </div>
              <button onClick={() => dismissCall(call.id)} className="text-zinc-600 hover:text-zinc-300">
                <X className="size-4" />
              </button>
            </div>

            {/* Customer info */}
            {c ? (
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 size-4 text-zinc-500" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{name}</p>
                    {c.company_name && c.first_name && (
                      <p className="text-xs text-zinc-400">{c.company_name}</p>
                    )}
                  </div>
                </div>
                {c.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-3.5 text-zinc-500" />
                    <p className="text-xs text-zinc-400">{c.address}{c.city ? `, ${c.city}` : ""}</p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <ShoppingCart className="size-3.5 text-zinc-500" />
                  <p className="text-xs text-zinc-400">
                    {c.total_orders} orders · {formatUsd(c.total_spent_cents)} lifetime
                  </p>
                </div>
                {c.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {c.tags.slice(0, 5).map((tag) => (
                      <span key={tag} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {c.is_charge_account && (
                  <p className="text-[10px] font-semibold text-indigo-400">
                    Charge Account: {c.charge_account_name}
                  </p>
                )}
              </div>
            ) : (
              <div className="px-4 py-3">
                <p className="text-xs text-zinc-500">No matching customer found</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex border-t border-zinc-800">
              {c && (
                <button
                  onClick={() => {
                    onAttachCustomer({
                      id: c.id,
                      name,
                      phone: c.phone || call.caller_phone,
                      email: c.email || "",
                      address: c.address || "",
                    });
                    dismissCall(call.id);
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 border-r border-zinc-800 py-2.5 text-xs font-medium text-amber-400 hover:bg-zinc-800"
                >
                  <ShoppingCart className="size-3.5" />
                  Add to Order
                </button>
              )}
              <a
                href={`tel:${call.caller_phone}`}
                className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-green-400 hover:bg-zinc-800"
              >
                <Phone className="size-3.5" />
                Call Back
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
