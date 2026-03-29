"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Phone, X, User, ShoppingCart, MapPin, MessageSquare, UserPlus, ExternalLink } from "lucide-react";
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
    sms_message?: string;
  } | null;
  created_at: string;
}

interface RecentOrder {
  id: string;
  order_number: string;
  placed_at: string;
  grand_total_cents: number;
  status: string;
  delivery_method: string;
}

interface CallerIdPopupProps {
  onAttachCustomer: (customer: {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
  }) => void;
  onOpenCustomerTab?: (customerId: string) => void;
}

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "").slice(-10);
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return phone;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
}

export function CallerIdPopup({ onAttachCustomer, onOpenCustomerTab }: CallerIdPopupProps) {
  const [calls, setCalls] = useState<IncomingCall[]>([]);
  const [recentOrders, setRecentOrders] = useState<Record<string, RecentOrder[]>>({});
  const [showCreateForm, setShowCreateForm] = useState<string | null>(null); // call id
  const interacted = useRef<Set<string>>(new Set());

  const dismissCall = useCallback((id: string) => {
    setCalls((prev) => prev.filter((c) => c.id !== id));
    setShowCreateForm((prev) => (prev === id ? null : prev));
    const supabase = getSupabaseBrowserClient();
    (supabase as any).from("incoming_calls").update({ dismissed: true }).eq("id", id).then(() => {});
  }, []);

  // Auto-dismiss after 60 seconds if not interacted
  useEffect(() => {
    const timers = calls.map((call) => {
      const age = Date.now() - new Date(call.created_at).getTime();
      const remaining = Math.max(60000 - age, 1000);
      return setTimeout(() => {
        if (!interacted.current.has(call.id)) dismissCall(call.id);
      }, remaining);
    });
    return () => timers.forEach(clearTimeout);
  }, [calls, dismissCall]);

  // Fetch recent orders for a customer
  const fetchRecentOrders = useCallback(async (customerId: string) => {
    if (recentOrders[customerId]) return;
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await (supabase as any)
        .from("orders")
        .select("id, order_number, placed_at, grand_total_cents, status, delivery_method")
        .eq("account_id", customerId)
        .order("placed_at", { ascending: false })
        .limit(3);
      // Try by customer_id too (orders may link via metadata)
      if (!data || data.length === 0) {
        // Fallback: search by customer phone in metadata
        return;
      }
      setRecentOrders((prev) => ({ ...prev, [customerId]: data }));
    } catch {}
  }, [recentOrders]);

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

          // Fetch recent orders if customer matched
          if (call.customer_data?.id) {
            fetchRecentOrders(call.customer_data.id);
          }

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
  }, [fetchRecentOrders]);

  if (calls.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-[100] flex flex-col gap-2" style={{ maxWidth: 400 }}>
      {calls.map((call) => {
        const c = call.customer_data;
        const name = c
          ? [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || "Customer"
          : "Unknown Caller";
        const isSms = c?.sms_message != null;
        const smsText = c?.sms_message;
        const orders = c?.id ? recentOrders[c.id] ?? [] : [];

        return (
          <div
            key={call.id}
            className={`animate-in slide-in-from-right rounded-xl border bg-zinc-900 shadow-2xl ${
              isSms ? "border-blue-600/40 shadow-blue-900/20" : "border-green-600/40 shadow-green-900/20"
            }`}
          >
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2.5">
              <div className={`flex size-8 items-center justify-center rounded-full ${isSms ? "bg-blue-600" : "bg-green-600 animate-pulse"}`}>
                {isSms ? <MessageSquare className="size-4 text-white" /> : <Phone className="size-4 text-white" />}
              </div>
              <div className="flex-1">
                <p className={`text-xs font-medium ${isSms ? "text-blue-400" : "text-green-400"}`}>
                  {isSms ? "Incoming Text" : "Incoming Call"}
                </p>
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

                {/* Recent orders */}
                {orders.length > 0 && (
                  <div className="border-t border-zinc-800 pt-2 mt-1">
                    <p className="text-[10px] font-bold uppercase text-zinc-500 mb-1">Recent Orders</p>
                    {orders.map((o) => (
                      <div key={o.id} className="flex items-center justify-between text-xs text-zinc-400 py-0.5">
                        <span>#{o.order_number} · {formatShortDate(o.placed_at)}</span>
                        <span>{formatUsd(o.grand_total_cents)} · {o.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="px-4 py-3">
                <p className="text-xs text-zinc-500">No matching customer found</p>
              </div>
            )}

            {/* SMS message preview */}
            {isSms && smsText && (
              <div className="border-t border-zinc-800 px-4 py-2.5">
                <p className="text-[10px] font-medium text-blue-400 mb-1">Message:</p>
                <p className="text-xs text-zinc-300 leading-relaxed">&ldquo;{smsText.length > 200 ? smsText.slice(0, 200) + "..." : smsText}&rdquo;</p>
              </div>
            )}

            {/* Quick-create form for unknown callers */}
            {showCreateForm === call.id && !c && (
              <QuickCreateForm
                phone={call.caller_phone}
                onCreated={(customer) => {
                  setShowCreateForm(null);
                  onAttachCustomer({
                    id: customer.id,
                    name: customer.name,
                    phone: customer.phone,
                    email: customer.email ?? "",
                    address: customer.address ?? "",
                  });
                  dismissCall(call.id);
                }}
                onCancel={() => setShowCreateForm(null)}
              />
            )}

            {/* Actions */}
            <div className="flex border-t border-zinc-800">
              {c ? (
                <>
                  {onOpenCustomerTab && (
                    <button
                      onClick={() => {
                        interacted.current.add(call.id);
                        onOpenCustomerTab(c.id);
                        dismissCall(call.id);
                      }}
                      className="flex flex-1 items-center justify-center gap-1.5 border-r border-zinc-800 py-2.5 text-xs font-medium text-blue-400 hover:bg-zinc-800"
                    >
                      <ExternalLink className="size-3.5" />
                      Open
                    </button>
                  )}
                  <button
                    onClick={() => {
                      interacted.current.add(call.id);
                      onAttachCustomer({
                        id: c.id,
                        name: (c.first_name || c.last_name) ? name : "",
                        phone: c.phone || call.caller_phone,
                        email: c.email || "",
                        address: c.address || "",
                      });
                      dismissCall(call.id);
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 border-r border-zinc-800 py-2.5 text-xs font-medium text-amber-400 hover:bg-zinc-800"
                  >
                    <ShoppingCart className="size-3.5" />
                    Add to Cart
                  </button>
                </>
              ) : (
                <>
                  {showCreateForm !== call.id && (
                    <button
                      onClick={() => {
                        interacted.current.add(call.id);
                        setShowCreateForm(call.id);
                      }}
                      className="flex flex-1 items-center justify-center gap-1.5 border-r border-zinc-800 py-2.5 text-xs font-medium text-blue-400 hover:bg-zinc-800"
                    >
                      <UserPlus className="size-3.5" />
                      Create Customer
                    </button>
                  )}
                </>
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

// ── Quick-Create Customer Form ──────────────────────────────────

function QuickCreateForm({
  phone,
  onCreated,
  onCancel,
}: {
  phone: string;
  onCreated: (customer: { id: string; name: string; phone: string; email?: string; address?: string }) => void;
  onCancel: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [customerType, setCustomerType] = useState("homeowner");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!firstName.trim()) return;
    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const normalizedPhone = phone.replace(/\D/g, "").slice(-10);
      const { data, error } = await (supabase as any)
        .from("customers")
        .insert({
          first_name: firstName.trim(),
          last_name: lastName.trim() || null,
          phone: normalizedPhone,
          email: email.trim() || null,
          address: address.trim() || null,
          customer_type: customerType,
          source: "phone_call",
        })
        .select("id")
        .single();

      if (error) throw error;

      onCreated({
        id: data.id,
        name: [firstName, lastName].filter(Boolean).join(" "),
        phone: normalizedPhone,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
      });
    } catch (err) {
      console.error("Failed to create customer:", err);
      setSaving(false);
    }
  }

  return (
    <div className="border-t border-zinc-800 px-4 py-3 space-y-2">
      <p className="text-[10px] font-bold uppercase text-zinc-500">New Customer</p>
      <p className="text-xs text-zinc-400">Phone: {formatPhone(phone)}</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First name *"
          className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
          autoFocus
        />
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Last name"
          className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
      />
      <input
        type="text"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Address"
        className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
      />
      <select
        value={customerType}
        onChange={(e) => setCustomerType(e.target.value)}
        className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
      >
        <option value="homeowner">Homeowner</option>
        <option value="contractor">Contractor</option>
        <option value="business">Business</option>
      </select>
      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 rounded bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-700"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !firstName.trim()}
          className="flex-1 rounded bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Customer"}
        </button>
      </div>
    </div>
  );
}
