"use client";

import { useState } from "react";
import { X, Loader2, MapPin, ExternalLink, Send } from "lucide-react";

const TIMELINES = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "next_week", label: "Next Week" },
  { value: "few_weeks", label: "A Few Weeks" },
  { value: "next_month", label: "Next Month" },
  { value: "few_months", label: "A Few Months" },
  { value: "flexible", label: "Flexible" },
];

const SERVICE_TYPES = [
  "Driveway Install",
  "Driveway Resurface",
  "Patio / Walkway",
  "Retaining Wall",
  "Landscaping",
  "Mulch Install",
  "Grading / Excavation",
  "Drainage",
  "Property Maintenance",
  "Masonry",
  "Other",
];

const SALES_CONTACTS = [
  { id: "adam", name: "Adam" },
  { id: "ronnie", name: "Ronnie" },
];

interface Props {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  onClose: () => void;
}

export function NewLeadModal({ customerName, customerPhone, customerEmail, customerAddress, onClose }: Props) {
  const [name, setName] = useState(customerName || "");
  const [phone, setPhone] = useState(customerPhone || "");
  const [email, setEmail] = useState(customerEmail || "");
  const [address, setAddress] = useState(customerAddress || "");
  const [serviceType, setServiceType] = useState("");
  const [timeline, setTimeline] = useState("next_week");
  const [notes, setNotes] = useState("");
  const [assignTo, setAssignTo] = useState("adam");
  const [sendToContractors, setSendToContractors] = useState(false);
  const [priority, setPriority] = useState("normal");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const mapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;
  const streetViewUrl = address
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(address)}`
    : null;

  async function handleSave() {
    if (!name.trim() && !phone.trim()) {
      setError("Name or phone is required.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          service_type: serviceType || "other",
          timeline,
          description: notes.trim(),
          priority,
          source: "phone",
          source_detail: "POS new lead modal",
          assigned_to: assignTo,
          send_to_contractors: sendToContractors,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to create lead.");
        setSaving(false);
        return;
      }

      setSaved(true);
      setTimeout(onClose, 1500);
    } catch {
      setError("Network error.");
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="rounded-2xl border border-green-600/40 bg-zinc-900 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-green-600">
            <Send className="size-6 text-white" />
          </div>
          <p className="text-lg font-semibold text-zinc-100">Lead Created!</p>
          <p className="mt-1 text-sm text-zinc-400">
            {name || "New lead"} — assigned to {SALES_CONTACTS.find((c) => c.id === assignTo)?.name || assignTo}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <div style={{ filter: "drop-shadow(0 0 4px #39ff1466)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="22" height="22">
                <g fill="#39FF14" stroke="#39FF14">
                  <circle cx="28" cy="14" r="6.5" stroke="none" />
                  <path d="M 11 29 C 11 21, 21 19, 28 19 C 35 19, 45 21, 45 29 Z" stroke="none" />
                  <circle cx="72" cy="14" r="6.5" stroke="none" />
                  <path d="M 55 29 C 55 21, 65 19, 72 19 C 79 19, 89 21, 89 29 Z" stroke="none" />
                  <g strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="36" x2="92" y2="36" />
                    <path d="M 14 36 L 41 63 L 41 76" />
                    <path d="M 86 36 L 59 63 L 59 76" />
                  </g>
                  <g strokeWidth="3.5" fill="none">
                    <ellipse cx="50" cy="84" rx="16" ry="6" />
                    <path d="M 34 90 A 16 6 0 0 0 66 90" strokeLinecap="round" />
                  </g>
                </g>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-zinc-100">New Service Lead</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ scrollbarWidth: "thin", scrollbarColor: "#d97706 transparent" }}>
          {/* Contact info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer name"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Phone *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(631) 555-0123"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, Town NY"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Google Maps links */}
          {address && (
            <div className="flex gap-2">
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  <MapPin className="size-3.5" />
                  Satellite View
                  <ExternalLink className="size-3" />
                </a>
              )}
              {streetViewUrl && (
                <a
                  href={streetViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  <MapPin className="size-3.5" />
                  Street View
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          )}

          {/* Service type */}
          <div>
            <label className="mb-1.5 block text-xs text-zinc-400">Service Type</label>
            <div className="flex flex-wrap gap-1.5">
              {SERVICE_TYPES.map((st) => (
                <button
                  key={st}
                  onClick={() => setServiceType(st.toLowerCase().replace(/\s+/g, "_"))}
                  className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                    serviceType === st.toLowerCase().replace(/\s+/g, "_")
                      ? "border-amber-500 bg-amber-900/30 text-amber-300"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Timeline</label>
              <select
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {TIMELINES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Project Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the project, materials needed, special requirements..."
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Assignment */}
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Assign To</label>
            <div className="flex gap-2">
              {SALES_CONTACTS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setAssignTo(c.id)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    assignTo === c.id
                      ? "border-amber-500 bg-amber-900/30 text-amber-300"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Send to contractors */}
          <label className="flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-800/50 px-3 py-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={sendToContractors}
              onChange={(e) => setSendToContractors(e.target.checked)}
              className="size-4 accent-green-500"
            />
            <div>
              <span className="text-sm font-medium text-zinc-300">Notify contractors via SMS</span>
              <p className="text-[10px] text-zinc-500">Send lead details to matching contractors</p>
            </div>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 px-5 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-700 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Saving...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Send className="size-4" /> Save & Send
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
