"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  town: string | null;
  service_type: string;
  status: string;
  timeline: string | null;
  description: string | null;
  referral_source: string | null;
  customer_id: string | null;
  internal_notes: string | null;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  quoted: "bg-purple-100 text-purple-800",
  scheduled: "bg-green-100 text-green-800",
  completed: "bg-green-200 text-green-900",
  lost: "bg-gray-100 text-gray-600",
  spam: "bg-red-100 text-red-800",
};

const SERVICE_LABELS: Record<string, string> = {
  "gravel-driveway-new": "Gravel Driveway — New",
  "gravel-driveway-resurface": "Gravel Driveway — Resurface",
  "paver-driveway": "Paver Driveway",
  "driveway-edging": "Driveway Edging",
  "asphalt-prep": "Asphalt Prep",
  "landscaping-design": "Landscaping — Design",
  "landscaping-grading-drainage": "Grading & Drainage",
  "landscaping-sod-lawn": "Sod / Lawn",
  "landscaping-retaining-wall": "Retaining Wall (Landscape)",
  "landscaping-garden-beds": "Garden Beds",
  "masonry-patio": "Patio",
  "masonry-walkway": "Walkway",
  "masonry-retaining-wall": "Retaining Wall (Masonry)",
  "masonry-fireplace": "Fireplace / Kitchen",
  "masonry-veneer-steps": "Veneer / Steps",
  "property-maintenance": "Property Maintenance",
  "other": "Other",
};

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (statusFilter !== "all") params.set("status", statusFilter);

    const res = await fetch(`/api/admin/leads?${params}`);
    if (res.ok) {
      const data = await res.json();
      setLeads(data.leads);
      setTotal(data.total);
    }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/admin/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchLeads();
  }

  function formatPhone(phone: string) {
    if (phone.length === 10) return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
    return phone;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Service Leads</h1>
          <p className="text-sm text-muted-foreground">{total} total leads</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["all", "new", "contacted", "quoted", "scheduled", "completed", "lost", "spam"].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => { setStatusFilter(s); setPage(1); }}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {/* Leads table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Service</th>
              <th className="px-4 py-3 font-medium">Town</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No leads found</td></tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <button
                      className="font-medium text-primary hover:underline"
                      onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}
                    >
                      {lead.name}
                    </button>
                    {lead.customer_id && (
                      <span className="ml-1 text-xs text-green-600" title="Existing customer">
                        ★
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <a href={`tel:+1${lead.phone}`} className="text-primary hover:underline">
                      {formatPhone(lead.phone)}
                    </a>
                  </td>
                  <td className="px-4 py-3">{SERVICE_LABELS[lead.service_type] || lead.service_type}</td>
                  <td className="px-4 py-3">{lead.town || "-"}</td>
                  <td className="px-4 py-3">
                    <Badge className={STATUS_COLORS[lead.status] || ""}>{lead.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {lead.status === "new" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(lead.id, "contacted")}>
                          Mark Contacted
                        </Button>
                      )}
                      {lead.status === "new" && (
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => updateStatus(lead.id, "spam")}>
                          Spam
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Expanded lead detail */}
      {selectedLead && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{selectedLead.name}</h2>
            <Button variant="ghost" size="sm" onClick={() => setSelectedLead(null)}>Close</Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div><span className="text-muted-foreground">Phone:</span> <a href={`tel:+1${selectedLead.phone}`} className="font-medium text-primary">{formatPhone(selectedLead.phone)}</a></div>
            <div><span className="text-muted-foreground">Email:</span> {selectedLead.email || "-"}</div>
            <div><span className="text-muted-foreground">Town:</span> {selectedLead.town || "-"}</div>
            <div><span className="text-muted-foreground">Timeline:</span> {selectedLead.timeline || "-"}</div>
            <div><span className="text-muted-foreground">Referral:</span> {selectedLead.referral_source || "-"}</div>
            <div><span className="text-muted-foreground">Service:</span> {SERVICE_LABELS[selectedLead.service_type] || selectedLead.service_type}</div>
          </div>
          {selectedLead.description && (
            <div className="text-sm">
              <span className="text-muted-foreground">Description:</span>
              <p className="mt-1">{selectedLead.description}</p>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            {["new", "contacted", "quoted", "scheduled", "completed", "lost"].map((s) => (
              <Button
                key={s}
                size="sm"
                variant={selectedLead.status === s ? "default" : "outline"}
                onClick={() => {
                  updateStatus(selectedLead.id, s);
                  setSelectedLead({ ...selectedLead, status: s });
                }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {total > 25 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {Math.ceil(total / 25)}</span>
          <Button variant="outline" size="sm" disabled={page * 25 >= total} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
