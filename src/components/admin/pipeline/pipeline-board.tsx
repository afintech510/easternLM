"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Phone, Mail, MapPin, Package, Wrench, Clock, ChevronRight, X, Plus } from "lucide-react";
import { formatUsd } from "@/lib/format";

interface Lead {
  id: string;
  lead_number?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  town?: string;
  service_type?: string;
  description?: string;
  timeline?: string;
  status: string;
  lead_type?: string;
  value_tier?: string;
  priority?: string;
  estimated_value_cents?: number;
  assigned_to?: string;
  source?: string;
  created_at: string;
  quotes?: {
    id: string;
    quote_number: string;
    public_token: string;
    total_cents: number;
    status: string;
    sent_at?: string;
    viewed_at?: string;
    accepted_at?: string;
  } | null;
}

interface Stats {
  activeCount: number;
  quotedCount: number;
  pipelineValueCents: number;
  wonValueCents: number;
  conversionRate: number;
}

const STATUS_COLUMNS = [
  { key: "new", label: "New", color: "border-blue-500" },
  { key: "assigned", label: "Assigned", color: "border-yellow-500" },
  { key: "contacted", label: "Contacted", color: "border-cyan-500" },
  { key: "site_visit", label: "Site Visit", color: "border-purple-500" },
  { key: "quoted", label: "Quoted", color: "border-amber-500" },
  { key: "won", label: "Won", color: "border-green-500" },
  { key: "lost", label: "Lost", color: "border-zinc-600" },
];

const TIER_COLORS: Record<string, string> = {
  quick: "border-l-green-500",
  standard: "border-l-yellow-500",
  high: "border-l-red-500",
};

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const isService = lead.lead_type === "service";
  const days = daysSince(lead.created_at);
  const tierColor = TIER_COLORS[lead.value_tier ?? "standard"] ?? "border-l-zinc-600";

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800/80 border-l-4 ${tierColor}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${isService ? "bg-purple-900/50 text-purple-300" : "bg-blue-900/50 text-blue-300"}`}>
            {isService ? "SERVICE" : "MATERIAL"}
          </span>
          {lead.lead_number && <span className="text-[10px] text-zinc-600">{lead.lead_number}</span>}
        </div>
        {lead.priority === "urgent" && <span className="rounded bg-red-900/50 px-1.5 py-0.5 text-[9px] font-bold text-red-300">URGENT</span>}
        {lead.priority === "high" && <span className="rounded bg-amber-900/50 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">HIGH</span>}
      </div>

      <p className="mt-1.5 text-sm font-medium text-zinc-100">{lead.name || "Unknown"}</p>

      {lead.description && (
        <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">{lead.description}</p>
      )}

      <div className="mt-1.5 flex items-center justify-between">
        {lead.estimated_value_cents ? (
          <span className="text-sm font-bold text-amber-400">{formatUsd(lead.estimated_value_cents)}</span>
        ) : (
          <span className="text-xs text-zinc-600">No estimate</span>
        )}
        <span className="text-[10px] text-zinc-600">{days}d ago</span>
      </div>

      {lead.quotes && (
        <div className="mt-1.5 flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-[10px]">
          <span className="text-zinc-400">{lead.quotes.quote_number}</span>
          <span className={`font-medium ${
            lead.quotes.status === "accepted" ? "text-green-400" :
            lead.quotes.viewed_at ? "text-cyan-400" :
            lead.quotes.sent_at ? "text-amber-400" : "text-zinc-500"
          }`}>
            {lead.quotes.status === "accepted" ? "accepted" :
             lead.quotes.viewed_at ? "viewed" :
             lead.quotes.sent_at ? "sent" : "draft"}
          </span>
        </div>
      )}

      {lead.town && (
        <p className="mt-1 text-[10px] text-zinc-600">{lead.town}</p>
      )}
    </button>
  );
}

function LeadDetail({ lead, onClose, onStatusChange }: { lead: Lead; onClose: () => void; onStatusChange: (id: string, status: string) => void }) {
  const quoteUrl = lead.quotes?.public_token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/quote/${lead.quotes.public_token}`
    : null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-zinc-800 bg-zinc-950 shadow-2xl overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#d97706 transparent" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-zinc-100">{lead.name || "Unknown"}</p>
            <p className="text-xs text-zinc-500">{lead.lead_number || lead.id.slice(0, 8)}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="size-5" /></button>
        </div>

        {/* Quick actions */}
        <div className="mt-3 flex gap-2">
          {lead.phone && (
            <a href={`tel:+1${lead.phone.replace(/\D/g, "")}`} className="flex items-center gap-1 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">
              <Phone className="size-3.5" /> Call
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="flex items-center gap-1 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">
              <Mail className="size-3.5" /> Email
            </a>
          )}
          {quoteUrl && (
            <a href={quoteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-md border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">
              View Quote
            </a>
          )}
        </div>

        {/* Status selector */}
        <div className="mt-3 flex flex-wrap gap-1">
          {STATUS_COLUMNS.map((col) => (
            <button
              key={col.key}
              onClick={() => onStatusChange(lead.id, col.key)}
              className={`rounded-md px-2.5 py-1 text-[10px] font-medium ${
                lead.status === col.key
                  ? "bg-amber-600 text-white"
                  : "border border-zinc-700 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              {col.label}
            </button>
          ))}
        </div>
      </div>

      {/* Details */}
      <div className="px-5 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-zinc-500">Type</p>
            <p className="text-sm text-zinc-200">{lead.lead_type === "service" ? "Service" : "Material"}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500">Value Tier</p>
            <p className="text-sm text-zinc-200 capitalize">{lead.value_tier || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500">Source</p>
            <p className="text-sm text-zinc-200">{lead.source || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500">Timeline</p>
            <p className="text-sm text-zinc-200">{lead.timeline || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500">Service Type</p>
            <p className="text-sm text-zinc-200">{lead.service_type || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500">Assigned</p>
            <p className="text-sm text-zinc-200">{lead.assigned_to || "Unassigned"}</p>
          </div>
        </div>

        {lead.phone && (
          <div className="flex items-center gap-2">
            <Phone className="size-3.5 text-zinc-500" />
            <a href={`tel:+1${lead.phone.replace(/\D/g, "")}`} className="text-sm text-zinc-300 hover:text-amber-400">{lead.phone}</a>
          </div>
        )}
        {lead.email && (
          <div className="flex items-center gap-2">
            <Mail className="size-3.5 text-zinc-500" />
            <a href={`mailto:${lead.email}`} className="text-sm text-zinc-300 hover:text-amber-400">{lead.email}</a>
          </div>
        )}
        {lead.address && (
          <div className="flex items-start gap-2">
            <MapPin className="size-3.5 text-zinc-500 mt-0.5" />
            <div>
              <p className="text-sm text-zinc-300">{lead.address}</p>
              <div className="mt-1 flex gap-2">
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.address)}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-amber-500 hover:underline">Satellite</a>
                <a href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(lead.address)}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-amber-500 hover:underline">Street View</a>
              </div>
            </div>
          </div>
        )}

        {lead.description && (
          <div>
            <p className="text-[10px] text-zinc-500 mb-1">Description</p>
            <p className="text-sm text-zinc-300 whitespace-pre-wrap">{lead.description}</p>
          </div>
        )}

        {/* Quote info */}
        {lead.quotes && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
            <p className="text-xs font-semibold text-zinc-400 mb-2">Linked Quote</p>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-200">{lead.quotes.quote_number}</span>
              <span className="text-sm font-bold text-amber-400">{formatUsd(lead.quotes.total_cents)}</span>
            </div>
            <p className="mt-1 text-[10px] text-zinc-500">
              Status: {lead.quotes.status}
              {lead.quotes.viewed_at && ` · Viewed ${new Date(lead.quotes.viewed_at).toLocaleDateString()}`}
              {lead.quotes.accepted_at && ` · Accepted ${new Date(lead.quotes.accepted_at).toLocaleDateString()}`}
            </p>
          </div>
        )}

        <p className="text-[10px] text-zinc-600">Created {new Date(lead.created_at).toLocaleString()}</p>
      </div>
    </div>
  );
}

export function PipelineBoard({ initialLeads, initialType, stats }: { initialLeads: Lead[]; initialType: string; stats: Stats }) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [view, setView] = useState<"kanban" | "list">("kanban");

  const filtered = useMemo(() => {
    let list = leads;
    if (typeFilter !== "all") list = list.filter((l) => l.lead_type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((l) =>
        (l.name ?? "").toLowerCase().includes(q) ||
        (l.phone ?? "").includes(q) ||
        (l.lead_number ?? "").toLowerCase().includes(q) ||
        (l.description ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [leads, typeFilter, search]);

  const columns = useMemo(() => {
    return STATUS_COLUMNS.map((col) => ({
      ...col,
      leads: filtered.filter((l) => l.status === col.key),
    }));
  }, [filtered]);

  async function handleStatusChange(leadId: string, newStatus: string) {
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status: newStatus } : l));
    if (selectedLead?.id === leadId) setSelectedLead((prev) => prev ? { ...prev, status: newStatus } : null);

    await fetch(`/api/admin/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="[font-family:var(--font-display)] text-3xl text-primary">Pipeline</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setView("kanban")} className={`rounded-md px-3 py-1.5 text-xs font-medium ${view === "kanban" ? "bg-accent text-white" : "border border-zinc-300 text-muted-foreground"}`}>Board</button>
          <button onClick={() => setView("list")} className={`rounded-md px-3 py-1.5 text-xs font-medium ${view === "list" ? "bg-accent text-white" : "border border-zinc-300 text-muted-foreground"}`}>List</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Active Leads", value: String(stats.activeCount) },
          { label: "Quoted", value: String(stats.quotedCount) },
          { label: "Pipeline Value", value: formatUsd(stats.pipelineValueCents) },
          { label: "Won (MTD)", value: formatUsd(stats.wonValueCents) },
          { label: "Conversion", value: `${stats.conversionRate}%` },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-3 text-center">
            <p className="text-lg font-bold">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {[
            { key: "all", label: "All" },
            { key: "material", label: "Material" },
            { key: "service", label: "Service" },
          ].map((t) => (
            <button key={t.key} onClick={() => setTypeFilter(t.key)} className={`rounded-md px-3 py-1.5 text-xs font-medium ${typeFilter === t.key ? "bg-accent text-white" : "border text-muted-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="w-full rounded-md border bg-background py-1.5 pl-8 pr-3 text-sm"
          />
        </div>
      </div>

      {/* Kanban Board */}
      {view === "kanban" && (
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ scrollbarWidth: "thin", scrollbarColor: "#d97706 transparent" }}>
          {columns.map((col) => (
            <div key={col.key} className="w-64 shrink-0">
              <div className={`mb-2 flex items-center justify-between rounded-t-lg border-t-4 ${col.color} bg-card px-3 py-2`}>
                <span className="text-xs font-semibold">{col.label}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">{col.leads.length}</span>
              </div>
              <div className="space-y-2">
                {col.leads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} onClick={() => setSelectedLead(lead)} />
                ))}
                {col.leads.length === 0 && (
                  <div className="rounded-lg border border-dashed border-zinc-800 p-4 text-center text-xs text-muted-foreground">
                    No leads
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Lead</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Type</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Value</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Quote</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Age</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((lead) => (
                <tr key={lead.id} onClick={() => setSelectedLead(lead)} className="cursor-pointer hover:bg-muted/20">
                  <td className="px-3 py-2.5">
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.phone || lead.email || "—"}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${lead.lead_type === "service" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                      {lead.lead_type === "service" ? "Service" : "Material"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs capitalize">{lead.status}</td>
                  <td className="px-3 py-2.5 text-xs font-semibold">{lead.estimated_value_cents ? formatUsd(lead.estimated_value_cents) : "—"}</td>
                  <td className="px-3 py-2.5 text-xs">{lead.quotes?.quote_number || "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{daysSince(lead.created_at)}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail slide-over */}
      {selectedLead && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setSelectedLead(null)} />
          <LeadDetail lead={selectedLead} onClose={() => setSelectedLead(null)} onStatusChange={handleStatusChange} />
        </>
      )}
    </div>
  );
}
