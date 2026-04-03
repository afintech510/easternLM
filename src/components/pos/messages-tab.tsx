"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Send,
  X,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// ── Types ────────────────────────────────────────────────────────

interface Conversation {
  customer_phone: string;
  customer_name: string | null;
  customer_id: string | null;
  business_number: string;
  last_message_body: string | null;
  last_message_at: string;
  last_direction: string;
  unread: boolean;
  message_count: number;
}

interface SmsMessage {
  id: string;
  direction: "inbound" | "outbound";
  from_number: string;
  to_number: string;
  body: string | null;
  media_urls: string[];
  status: string;
  customer_name: string | null;
  business_number: string;
  staff_sender: string | null;
  created_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "").slice(-10);
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return phone;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const QUICK_REPLIES = [
  { label: "👋 Hi", text: "Hi, thanks for reaching out to Eastern LM! How can we help?" },
  { label: "⏰ Hours", text: "We're open Mon-Fri 7am-5pm, Sat 7am-3pm. Closed Sundays." },
  { label: "📍 Address", text: "110 Frowein Road, Center Moriches, NY 11934" },
  { label: "🚚 Delivery", text: "We deliver throughout Suffolk County! What's the delivery address? I can get you a quote." },
  { label: "✅ Confirm", text: "Your order is confirmed! We'll text you when the delivery is on its way." },
];

// ── Conversation Thread ──────────────────────────────────────────

function ConversationThread({
  customerPhone,
  onBack,
}: {
  customerPhone: string;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<{ name: string; orders: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchThread = useCallback(async () => {
    const res = await fetch(`/api/pos/messages/thread?phone=${encodeURIComponent(customerPhone)}`);
    if (res.ok) setMessages(await res.json());
  }, [customerPhone]);

  useEffect(() => {
    fetchThread();
    // Mark as read
    fetch("/api/pos/messages/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: customerPhone }),
    }).catch(() => {});
  }, [customerPhone, fetchThread]);

  // Real-time updates for this thread
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`sms-thread-${customerPhone}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sms_messages" }, () => fetchThread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [customerPhone, fetchThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch customer info
  useEffect(() => {
    const digits = customerPhone.replace(/\D/g, "").slice(-10);
    if (digits.length >= 10) {
      fetch(`/api/pos/customers/search?q=${digits}&limit=1`)
        .then((r) => r.json())
        .then((d) => {
          const c = d.customers?.[0];
          if (c) setCustomerInfo({ name: [c.first_name, c.last_name].filter(Boolean).join(" "), orders: c.total_orders });
        })
        .catch(() => {});
    }
  }, [customerPhone]);

  async function handleSend() {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    const from = messages.find((m) => m.business_number)?.business_number ?? "+16318746244";
    const res = await fetch("/api/pos/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: customerPhone, body: newMessage, from }),
    });
    setSending(false);
    if (res.ok) {
      setNewMessage("");
      fetchThread();
    }
  }

  // Group messages by date
  let lastDate = "";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2.5">
        <button onClick={onBack} className="text-zinc-400 hover:text-white">
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            {customerInfo?.name || formatPhone(customerPhone)}
          </p>
          <p className="text-[10px] text-zinc-500">
            {formatPhone(customerPhone)}
            {customerInfo && ` · ${customerInfo.orders} orders`}
          </p>
        </div>
        <a href={`tel:${customerPhone}`} className="flex size-8 items-center justify-center rounded-lg bg-green-600/20 text-green-400">
          <Phone className="size-4" />
        </a>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" }}>
        {messages.map((msg) => {
          const msgDate = formatDate(msg.created_at);
          let showDate = false;
          if (msgDate !== lastDate) {
            lastDate = msgDate;
            showDate = true;
          }
          return (
            <div key={msg.id}>
              {showDate && (
                <p className="text-center text-[10px] text-zinc-600 py-2">{msgDate}</p>
              )}
              <div className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${
                    msg.direction === "outbound"
                      ? "bg-amber-600 text-white rounded-br-md"
                      : "bg-zinc-800 text-zinc-100 rounded-bl-md"
                  }`}
                >
                  <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                  <p className={`text-[9px] mt-0.5 ${msg.direction === "outbound" ? "text-white/50" : "text-zinc-500"}`}>
                    {formatTime(msg.created_at)}
                    {msg.direction === "outbound" && msg.staff_sender && ` · ${msg.staff_sender}`}
                    {msg.status === "failed" && " · Failed"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      <div className="flex gap-1 px-3 py-1.5 overflow-x-auto border-t border-zinc-800" style={{ scrollbarWidth: "none" }}>
        {QUICK_REPLIES.map((qr) => (
          <button
            key={qr.label}
            onClick={() => setNewMessage(qr.text)}
            className="flex-shrink-0 rounded-full bg-zinc-800 px-2.5 py-1 text-[10px] text-zinc-400 hover:bg-zinc-700 whitespace-nowrap"
          >
            {qr.label}
          </button>
        ))}
      </div>

      {/* Compose */}
      <div className="flex items-center gap-2 border-t border-zinc-800 p-2.5">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Type a message..."
          className="flex-1 h-9 rounded-lg bg-zinc-800 border border-zinc-700 px-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <button
          onClick={handleSend}
          disabled={sending || !newMessage.trim()}
          className="flex size-9 items-center justify-center rounded-lg bg-amber-600 text-white disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ── New Message Modal ────────────────────────────────────────────

function NewMessageModal({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: (phone: string) => void;
}) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [fromNumber, setFromNumber] = useState("+16318746244");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (phone.length < 3) { setSuggestions([]); return; }
    const timer = setTimeout(() => {
      fetch(`/api/pos/customers/search?q=${encodeURIComponent(phone)}&limit=5`)
        .then((r) => r.json())
        .then((d) => setSuggestions(d.customers || []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [phone]);

  async function handleSend() {
    if (!phone || !message.trim()) return;
    setSending(true);
    const res = await fetch("/api/pos/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: phone, body: message, from: fromNumber }),
    });
    setSending(false);
    if (res.ok) {
      const normalizedPhone = phone.replace(/\D/g, "");
      onSent(normalizedPhone.length === 10 ? `+1${normalizedPhone}` : `+${normalizedPhone}`);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">New Message</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="size-4" /></button>
        </div>

        <div>
          <label className="text-[10px] text-zinc-500 mb-1 block">To</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone or search customer..."
            className="w-full h-9 rounded-lg bg-zinc-800 border border-zinc-700 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            autoFocus
          />
          {suggestions.length > 0 && (
            <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-800">
              {suggestions.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => { setPhone(c.phone); setSuggestions([]); }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-zinc-700 border-b border-zinc-800 last:border-0"
                >
                  <span className="text-zinc-200">{[c.first_name, c.last_name].filter(Boolean).join(" ")}</span>
                  <span className="text-zinc-500">{c.phone}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-[10px] text-zinc-500 mb-1 block">From</label>
          <select
            value={fromNumber}
            onChange={(e) => setFromNumber(e.target.value)}
            className="w-full h-9 rounded-lg bg-zinc-800 border border-zinc-700 px-3 text-sm text-white"
          >
            <option value="+16318746244">Main (631) 874-6244</option>
            <option value="+16313668524">Sales (631) 366-8524</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] text-zinc-500 mb-1 block">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Type your message..."
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          <p className="text-[10px] text-zinc-600 mt-0.5">{message.length} chars</p>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 h-9 rounded-lg border border-zinc-700 text-sm text-zinc-400">Cancel</button>
          <button
            onClick={handleSend}
            disabled={sending || !phone || !message.trim()}
            className="flex-1 h-9 rounded-lg bg-amber-600 text-sm font-semibold text-white disabled:opacity-40"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Messages Tab (main export) ───────────────────────────────────

export function MessagesTab() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [numberFilter, setNumberFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const unreadCount = conversations.filter((c) => c.unread).length;

  async function handleSync() {
    setSyncing(true);
    await fetch("/api/cron/sync-sms").catch(() => {});
    await fetchConversations();
    setSyncing(false);
  }

  const fetchConversations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("number", numberFilter);
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/pos/messages/conversations?${params}`);
      if (res.ok) setConversations(await res.json());
    } catch {}
    setLoading(false);
  }, [numberFilter, searchQuery]);

  useEffect(() => {
    setLoading(true);
    fetchConversations();
  }, [fetchConversations]);

  // Stable ref for realtime callback — avoids subscription churn when filters change
  const fetchConversationsRef = useRef(fetchConversations);
  fetchConversationsRef.current = fetchConversations;

  // Real-time updates — single stable subscription (no dependency on fetchConversations)
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("sms-conversations")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sms_messages" }, () => fetchConversationsRef.current())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Thread view
  if (selectedPhone) {
    return (
      <ConversationThread
        customerPhone={selectedPhone}
        onBack={() => { setSelectedPhone(null); fetchConversations(); }}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Number filter + sync */}
      <div className="flex items-center gap-1 border-b border-zinc-800 px-2.5 py-2">
        {[
          { key: "all", label: "All" },
          { key: "+16318746244", label: "874-6244" },
          { key: "+16313668524", label: "366-8524" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setNumberFilter(key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              numberFilter === key ? "bg-amber-500/20 text-amber-400" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={handleSync}
          disabled={syncing}
          className="ml-auto flex size-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
          title="Sync messages from RingCentral"
        >
          <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Search */}
      <div className="px-2.5 py-2 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 size-3.5 text-zinc-500" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full h-8 rounded-lg bg-zinc-800 border border-zinc-700 pl-8 pr-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Unread badge */}
      {unreadCount > 0 && (
        <div className="px-3 py-1.5 bg-blue-500/10 text-blue-400 text-xs font-medium">
          {unreadCount} unread
        </div>
      )}

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#d97706 transparent" }}>
        {loading ? (
          <p className="py-12 text-center text-xs text-zinc-500">Loading...</p>
        ) : conversations.length === 0 ? (
          <p className="py-12 text-center text-xs text-zinc-500">No conversations yet</p>
        ) : (
          conversations.map((convo) => (
            <button
              key={convo.customer_phone}
              onClick={() => setSelectedPhone(convo.customer_phone)}
              className="flex w-full items-start gap-2.5 border-b border-zinc-800 px-3 py-2.5 text-left hover:bg-zinc-800/50 transition-colors"
            >
              {convo.unread && (
                <div className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-500" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-sm truncate ${convo.unread ? "font-semibold text-white" : "font-medium text-zinc-300"}`}>
                    {convo.customer_name || formatPhone(convo.customer_phone)}
                  </p>
                  <span className="shrink-0 text-[10px] text-zinc-600 ml-2">
                    {formatRelativeTime(convo.last_message_at)}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500">{formatPhone(convo.customer_phone)} · via {convo.business_number?.slice(-4)}</p>
                <p className="text-xs text-zinc-500 truncate mt-0.5">
                  {convo.last_direction === "outbound" ? "Sent: " : ""}
                  {convo.last_message_body}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* New message button */}
      <div className="border-t border-zinc-800 p-2">
        <button
          onClick={() => setShowNewMessage(true)}
          className="flex w-full h-9 items-center justify-center gap-1.5 rounded-lg bg-amber-600 text-sm font-semibold text-white hover:bg-amber-500"
        >
          <MessageSquare className="size-3.5" /> New Message
        </button>
      </div>

      {showNewMessage && (
        <NewMessageModal
          onClose={() => setShowNewMessage(false)}
          onSent={(phone) => {
            setShowNewMessage(false);
            setSelectedPhone(phone);
          }}
        />
      )}
    </div>
  );
}
