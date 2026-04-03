"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  ChevronLeft,
  Link2,
  X,
  Search,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatUsd } from "@/lib/format";

// ── Types ────────────────────────────────────────────────────────

interface CallCustomer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company_name: string | null;
  total_orders: number;
  total_spent_cents: number;
  tags: string[];
}

interface CallRecord {
  id: string;
  rc_session_id: string | null;
  direction: "inbound" | "outbound";
  from_number: string;
  to_number: string;
  from_name: string | null;
  extension_id: string | null;
  extension_name: string | null;
  status: string;
  started_at: string;
  answered_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  customer_id: string | null;
  customer_match_type: string | null;
  customer: CallCustomer | null;
  ai_summary: string | null;
  ai_action_items: string[] | null;
  ai_sentiment: string | null;
  requires_follow_up: boolean;
  follow_up_resolved: boolean;
  staff_notes: string | null;
}

type CallFilter = "today" | "missed" | "all";

// ── Helpers ──────────────────────────────────────────────────────

function formatPhoneNumber(phone: string): string {
  const d = phone.replace(/\D/g, "").slice(-10);
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return phone;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatShortTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ── Counter Toggle ───────────────────────────────────────────────

function CounterToggle() {
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pos/counter-checkin")
      .then((r) => r.json())
      .then((data) => setCheckedIn(data.checkedIn))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggle() {
    const newState = !checkedIn;
    setCheckedIn(newState); // optimistic
    try {
      const res = await fetch("/api/pos/counter-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkedIn: newState }),
      });
      if (!res.ok) {
        setCheckedIn(!newState); // revert
      }
    } catch {
      setCheckedIn(!newState); // revert
    }
  }

  if (loading) return null;

  return (
    <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Phone className="size-4 text-zinc-400" />
        <span className="text-xs font-medium text-zinc-400">Phone Status</span>
      </div>
      <button
        onClick={toggle}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
          checkedIn
            ? "bg-green-600 text-white"
            : "bg-zinc-700 text-zinc-400"
        }`}
      >
        <span
          className={`size-1.5 rounded-full ${
            checkedIn ? "bg-green-300 animate-pulse" : "bg-zinc-500"
          }`}
        />
        {checkedIn ? "I'm Here" : "Stepped Away"}
      </button>
    </div>
  );
}

// ── Call Row ─────────────────────────────────────────────────────

function CallRow({
  call,
  onResolve,
}: {
  call: CallRecord;
  onResolve?: (id: string) => void;
}) {
  const callerName = call.customer
    ? [call.customer.first_name, call.customer.last_name]
        .filter(Boolean)
        .join(" ") || call.customer.company_name || "Customer"
    : call.from_name ?? formatPhoneNumber(call.from_number);

  const isMissed = call.status === "missed";
  const needsFollowUp =
    call.requires_follow_up && !call.follow_up_resolved;

  return (
    <div
      className={`flex items-center gap-3 border-b border-zinc-800 px-3 py-2.5 ${
        needsFollowUp ? "bg-red-500/5" : "hover:bg-zinc-800/50"
      }`}
    >
      {/* Direction icon */}
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
          isMissed
            ? "bg-red-500/20 text-red-400"
            : call.direction === "inbound"
            ? "bg-blue-500/20 text-blue-400"
            : "bg-green-500/20 text-green-400"
        }`}
      >
        {isMissed ? (
          <PhoneMissed className="size-4" />
        ) : call.direction === "inbound" ? (
          <PhoneIncoming className="size-4" />
        ) : (
          <PhoneOutgoing className="size-4" />
        )}
      </div>

      {/* Caller info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100">
          {callerName}
        </p>
        <p className="text-xs text-zinc-500">
          {formatShortTime(call.started_at)}
          {call.duration_seconds != null &&
            call.duration_seconds > 0 &&
            ` · ${formatDuration(call.duration_seconds)}`}
          {call.extension_name && ` · ${call.extension_name}`}
        </p>
      </div>

      {/* Badges */}
      <div className="flex shrink-0 items-center gap-1.5">
        {call.customer ? (
          <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] text-green-400">
            {call.customer.total_orders} orders
          </span>
        ) : (
          <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
            New
          </span>
        )}
        {call.ai_summary && (
          <span className="text-[10px]" title="AI summary available">
            🤖
          </span>
        )}
      </div>

      {/* Follow-up actions */}
      {needsFollowUp && onResolve && (
        <div className="flex shrink-0 gap-1">
          <a
            href={`tel:${call.from_number}`}
            className="flex size-7 items-center justify-center rounded-md bg-green-600 text-white"
            title="Call back"
          >
            <Phone className="size-3.5" />
          </a>
          <button
            onClick={() => onResolve(call.id)}
            className="flex h-7 items-center rounded-md bg-zinc-700 px-2 text-[10px] font-medium text-zinc-300"
            title="Mark resolved"
          >
            ✓
          </button>
        </div>
      )}
    </div>
  );
}

// ── Call Detail Panel ─────────────────────────────────────────────

interface LinkedOrder {
  id: string;
  linked_by: string | null;
  linked_at: string;
  order: {
    id: string;
    order_number: string;
    grand_total_cents: number;
    status: string;
    placed_at: string;
  };
}

function CallDetail({
  call,
  onBack,
  onResolve,
}: {
  call: CallRecord;
  onBack: () => void;
  onResolve?: (id: string) => void;
}) {
  const [linkedOrders, setLinkedOrders] = useState<LinkedOrder[]>([]);
  const [showOrderPicker, setShowOrderPicker] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [linkingCustomer, setLinkingCustomer] = useState(false);

  const callerName = call.customer
    ? [call.customer.first_name, call.customer.last_name]
        .filter(Boolean)
        .join(" ") || call.customer.company_name || "Customer"
    : call.from_name ?? formatPhoneNumber(call.from_number);

  // Fetch linked orders
  useEffect(() => {
    fetch(`/api/pos/call-links?call_id=${call.id}`)
      .then((r) => r.json())
      .then(setLinkedOrders)
      .catch(() => {});
  }, [call.id]);

  async function linkOrder(orderId: string) {
    try {
      await fetch("/api/pos/call-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: call.id, orderId }),
      });
      // Refetch links
      const res = await fetch(`/api/pos/call-links?call_id=${call.id}`);
      setLinkedOrders(await res.json());
      setShowOrderPicker(false);
    } catch {}
  }

  async function unlinkOrder(linkId: string) {
    await fetch(`/api/pos/call-links?id=${linkId}`, { method: "DELETE" });
    setLinkedOrders((prev) => prev.filter((l) => l.id !== linkId));
  }

  async function linkCustomer(customerId: string) {
    setLinkingCustomer(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await (supabase as any)
        .from("call_records")
        .update({ customer_id: customerId, customer_match_type: "manual" })
        .eq("id", call.id);
      setCustomerSearch("");
      setCustomerResults([]);
      // Trigger refresh by going back
      onBack();
    } catch {
      setLinkingCustomer(false);
    }
  }

  async function searchCustomers(query: string) {
    if (query.trim().length < 2) {
      setCustomerResults([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/pos/customers/search?q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await res.json();
      setCustomerResults(data.customers || []);
    } catch {
      setCustomerResults([]);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2.5">
        <button onClick={onBack} className="text-zinc-400 hover:text-white">
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-100">
            {callerName}
          </p>
          <p className="text-xs text-zinc-500">
            {formatPhoneNumber(call.from_number)} ·{" "}
            {formatRelativeTime(call.started_at)}
          </p>
        </div>
        {call.requires_follow_up && !call.follow_up_resolved && onResolve && (
          <button
            onClick={() => onResolve(call.id)}
            className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white"
          >
            ✓ Resolved
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3" style={{ scrollbarWidth: "thin", scrollbarColor: "#d97706 transparent" }}>
        {/* Call info */}
        <div className="rounded-lg bg-zinc-800/50 p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-zinc-500">Direction</span>
            <span className="text-zinc-300 capitalize">{call.direction}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Status</span>
            <span className={`capitalize ${call.status === "missed" ? "text-red-400" : "text-zinc-300"}`}>
              {call.status}
            </span>
          </div>
          {call.duration_seconds != null && call.duration_seconds > 0 && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Duration</span>
              <span className="text-zinc-300">{formatDuration(call.duration_seconds)}</span>
            </div>
          )}
          {call.extension_name && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Extension</span>
              <span className="text-zinc-300">{call.extension_name}</span>
            </div>
          )}
        </div>

        {/* Customer info or link */}
        {call.customer ? (
          <div className="rounded-lg bg-zinc-800/50 p-3">
            <p className="text-[10px] font-bold uppercase text-zinc-500 mb-1.5">Customer</p>
            <p className="text-sm font-medium text-zinc-100">{callerName}</p>
            <p className="text-xs text-zinc-400">
              {call.customer.total_orders} orders · {formatUsd(call.customer.total_spent_cents)}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-700 p-3">
            <p className="text-[10px] font-bold uppercase text-zinc-500 mb-1.5">
              Link to Customer
            </p>
            <div className="relative">
              <Search className="absolute left-2 top-2 size-3 text-zinc-500" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  searchCustomers(e.target.value);
                }}
                placeholder="Search by name or phone..."
                className="w-full rounded border border-zinc-700 bg-zinc-800 pl-7 pr-2 py-1.5 text-xs placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            {customerResults.length > 0 && (
              <div className="mt-1 max-h-32 overflow-y-auto rounded border border-zinc-700 bg-zinc-900">
                {customerResults.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => linkCustomer(c.id)}
                    disabled={linkingCustomer}
                    className="flex w-full items-center justify-between px-2 py-1.5 text-xs hover:bg-zinc-800 border-b border-zinc-800 last:border-0"
                  >
                    <span className="text-zinc-200">
                      {[c.first_name, c.last_name].filter(Boolean).join(" ")}
                    </span>
                    <span className="text-zinc-500">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Summary */}
        {call.ai_summary ? (
          <div className="rounded-lg bg-zinc-800/50 p-3">
            <p className="text-[10px] font-bold uppercase text-zinc-500 mb-1">
              🤖 AI Summary
            </p>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {call.ai_summary}
            </p>
            {call.ai_action_items && call.ai_action_items.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] font-bold uppercase text-zinc-500 mb-1">
                  Action Items
                </p>
                <ul className="space-y-0.5">
                  {call.ai_action_items.map((item, i) => (
                    <li key={i} className="flex gap-1.5 text-xs text-zinc-400">
                      <span>☐</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {call.ai_sentiment && (
              <p className="text-[10px] text-zinc-500 mt-2">
                Sentiment:{" "}
                {call.ai_sentiment === "positive"
                  ? "😊"
                  : call.ai_sentiment === "negative"
                  ? "😟"
                  : "😐"}{" "}
                {call.ai_sentiment}
              </p>
            )}
          </div>
        ) : call.status === "completed" ? (
          <div className="rounded-lg bg-zinc-800/30 p-3 text-center text-xs text-zinc-600">
            No AI summary available
          </div>
        ) : null}

        {/* Linked Orders */}
        <div>
          <p className="text-[10px] font-bold uppercase text-zinc-500 mb-1.5">
            Linked Orders
          </p>
          {linkedOrders.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between rounded bg-zinc-800/30 p-2 mb-1 text-xs"
            >
              <span className="text-zinc-300">
                #{link.order.order_number} ·{" "}
                {formatUsd(link.order.grand_total_cents)} ·{" "}
                {link.order.status}
              </span>
              <button
                onClick={() => unlinkOrder(link.id)}
                className="text-zinc-600 hover:text-red-400"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}

          {showOrderPicker ? (
            <OrderSearchPicker
              customerId={call.customer_id}
              onSelect={linkOrder}
              onClose={() => setShowOrderPicker(false)}
            />
          ) : (
            <button
              onClick={() => setShowOrderPicker(true)}
              className="mt-1 flex items-center gap-1 text-xs text-amber-400 hover:underline"
            >
              <Link2 className="size-3" /> Link to an order
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Order Search Picker ──────────────────────────────────────────

function OrderSearchPicker({
  customerId,
  onSelect,
  onClose,
}: {
  customerId: string | null;
  onSelect: (orderId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // If customer is linked, fetch their recent orders
  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    (supabase as any)
      .from("orders")
      .select("id, order_number, grand_total_cents, status, placed_at, customer_name")
      .or(`metadata->>customerId.eq.${customerId},account_id.eq.${customerId}`)
      .order("placed_at", { ascending: false })
      .limit(10)
      .then(({ data }: any) => {
        setOrders(data ?? []);
        setLoading(false);
      });
  }, [customerId]);

  async function searchOrders(q: string) {
    if (q.trim().length < 2) return;
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await (supabase as any)
        .from("orders")
        .select("id, order_number, grand_total_cents, status, placed_at, customer_name")
        .or(`order_number.ilike.%${q}%,customer_name.ilike.%${q}%`)
        .order("placed_at", { ascending: false })
        .limit(10);
      setOrders(data ?? []);
    } catch {}
    setLoading(false);
  }

  return (
    <div className="mt-1 rounded-lg border border-zinc-700 bg-zinc-900 p-2">
      <div className="flex items-center gap-1 mb-1.5">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            if ((window as any).__orderSearchTimer) clearTimeout((window as any).__orderSearchTimer);
            (window as any).__orderSearchTimer = setTimeout(() => searchOrders(v), 300);
          }}
          placeholder="Search order # or customer..."
          className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs placeholder:text-zinc-600 focus:outline-none"
          autoFocus
        />
        <button onClick={onClose} className="text-zinc-500 hover:text-white">
          <X className="size-3.5" />
        </button>
      </div>
      {loading ? (
        <p className="py-2 text-center text-[10px] text-zinc-600">Loading...</p>
      ) : orders.length === 0 ? (
        <p className="py-2 text-center text-[10px] text-zinc-600">
          {customerId ? "No orders found" : "Type to search"}
        </p>
      ) : (
        <div className="max-h-32 overflow-y-auto">
          {orders.map((o: any) => (
            <button
              key={o.id}
              onClick={() => onSelect(o.id)}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs hover:bg-zinc-800"
            >
              <span className="text-zinc-200">
                #{o.order_number} · {o.customer_name}
              </span>
              <span className="text-zinc-500">
                {formatUsd(o.grand_total_cents)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Phone Tab (main export) ──────────────────────────────────────

export function PhoneTab() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [filter, setFilter] = useState<CallFilter>("today");
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);

  const missedCount = calls.filter(
    (c) => c.requires_follow_up && !c.follow_up_resolved
  ).length;

  const fetchCalls = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/pos/call-log?filter=${filter}&limit=50`
      );
      if (res.ok) {
        const data = await res.json();
        setCalls(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Fetch on mount and when filter changes
  useEffect(() => {
    setLoading(true);
    fetchCalls();
  }, [fetchCalls]);

  // Stable ref for realtime/polling callback
  const fetchCallsRef = useRef(fetchCalls);
  fetchCallsRef.current = fetchCalls;

  // Poll every 30 seconds — stable interval
  useEffect(() => {
    const interval = setInterval(() => fetchCallsRef.current(), 30000);
    return () => clearInterval(interval);
  }, []);

  // Supabase Realtime for instant updates — single stable subscription
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("call-log-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_records" },
        () => fetchCallsRef.current()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function resolveFollowUp(callId: string) {
    // Optimistic update
    setCalls((prev) =>
      prev.map((c) =>
        c.id === callId ? { ...c, follow_up_resolved: true } : c
      )
    );

    try {
      const supabase = getSupabaseBrowserClient();
      await (supabase as any)
        .from("call_records")
        .update({
          follow_up_resolved: true,
          follow_up_resolved_at: new Date().toISOString(),
          follow_up_resolved_by: "Counter",
        })
        .eq("id", callId);
    } catch {
      // Revert on failure
      fetchCalls();
    }
  }

  const missedCalls = calls.filter(
    (c) => c.requires_follow_up && !c.follow_up_resolved
  );

  // If a call is selected, show detail view
  if (selectedCall) {
    return (
      <CallDetail
        call={selectedCall}
        onBack={() => {
          setSelectedCall(null);
          fetchCalls(); // refresh in case something changed
        }}
        onResolve={resolveFollowUp}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Counter toggle */}
      <CounterToggle />

      {/* Filter pills */}
      <div className="flex gap-2 border-b border-zinc-800 px-3 py-2">
        {(
          [
            { key: "today" as CallFilter, label: "Today" },
            { key: "missed" as CallFilter, label: "Missed" },
            { key: "all" as CallFilter, label: "All" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === key
                ? "bg-amber-500/20 text-amber-400"
                : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {label}
            {key === "missed" && missedCount > 0 && (
              <span className="ml-1 rounded-full bg-red-500 px-1.5 text-[10px] text-white">
                {missedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Missed call alert */}
      {filter !== "missed" && missedCalls.length > 0 && (
        <div className="mx-3 mt-2 rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-400">
          📞 {missedCalls.length} missed call
          {missedCalls.length > 1 ? "s" : ""} need follow-up
        </div>
      )}

      {/* Call list */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#d97706 transparent" }}>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-xs text-zinc-500">
            <Clock className="mr-1.5 size-3.5 animate-spin" /> Loading calls...
          </div>
        ) : calls.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            {filter === "missed"
              ? "No missed calls to follow up on"
              : filter === "today"
              ? "No calls today yet"
              : "No call records"}
          </div>
        ) : (
          calls.map((call) => (
            <div key={call.id} onClick={() => setSelectedCall(call)} className="cursor-pointer">
              <CallRow
                call={call}
                onResolve={
                  call.requires_follow_up && !call.follow_up_resolved
                    ? resolveFollowUp
                    : undefined
                }
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
