"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HardHat, Loader2, Plus, Calendar, MapPin, Phone, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/format";

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  address: string | null;
  quote_id: string | null;
  order_id: string | null;
  estimated_start: string | null;
  estimated_end: string | null;
  notes: string | null;
  created_at: string;
  quotes?: { quote_number: string; total_cents: number } | null;
  orders?: { grand_total_cents: number; status: string; delivery_method: string } | null;
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-blue-100 text-blue-700" },
  scheduled: { label: "Scheduled", color: "bg-purple-100 text-purple-700" },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
  on_hold: { label: "On Hold", color: "bg-gray-100 text-gray-600" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700" },
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [creating, setCreating] = useState(false);

  async function loadProjects() {
    setLoading(true);
    const params = filter !== "all" ? `?status=${filter}` : "";
    const r = await fetch(`/api/admin/projects${params}`);
    if (r.ok) {
      const d = await r.json();
      setProjects(d.projects ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { loadProjects(); }, [filter]);

  async function createFromQuote() {
    const quoteId = prompt("Enter the Quote ID to create a project from:");
    if (!quoteId) return;
    setCreating(true);
    const r = await fetch("/api/admin/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quote_id: quoteId }),
    });
    if (r.ok) await loadProjects();
    else alert("Failed to create project");
    setCreating(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="[font-family:var(--font-display)] text-3xl text-primary">Projects</h1>
          <p className="text-sm text-muted-foreground">Jobs from accepted quotes, tracked through delivery and completion.</p>
        </div>
        <Button onClick={createFromQuote} disabled={creating}>
          <Plus className="size-4 mr-1.5" /> New Project
        </Button>
      </div>

      <div className="flex gap-1">
        {["active", "scheduled", "in_progress", "completed", "all"].map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
            {STATUS_CFG[s]?.label ?? "All"}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center"><Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" /></div>
      ) : projects.length === 0 ? (
        <div className="py-16 text-center">
          <HardHat className="mx-auto mb-3 size-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">No projects found. Create one from an accepted quote.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => {
            const cfg = STATUS_CFG[p.status] ?? STATUS_CFG.active;
            return (
              <div key={p.id} className="rounded-xl border bg-card p-5 space-y-2 hover:border-accent/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-base">{p.title}</h3>
                    {p.customer_name && (
                      <p className="text-sm text-muted-foreground">{p.customer_name}</p>
                    )}
                  </div>
                  <Badge className={cfg.color}>{cfg.label}</Badge>
                </div>

                {p.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                )}

                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {p.address && (
                    <span className="flex items-center gap-1"><MapPin className="size-3" /> {p.address}</span>
                  )}
                  {p.customer_phone && (
                    <a href={`tel:${p.customer_phone}`} className="flex items-center gap-1 hover:text-accent"><Phone className="size-3" /> {p.customer_phone}</a>
                  )}
                  {p.estimated_start && (
                    <span className="flex items-center gap-1"><Calendar className="size-3" /> {p.estimated_start}{p.estimated_end ? ` → ${p.estimated_end}` : ""}</span>
                  )}
                  {p.quotes && (
                    <Link href={`/admin/quotes/${p.quote_id}`} className="flex items-center gap-1 text-accent hover:underline">
                      <FileText className="size-3" /> {p.quotes.quote_number} ({formatUsd(p.quotes.total_cents)})
                    </Link>
                  )}
                  {p.orders && (
                    <span className="flex items-center gap-1">
                      Order: {p.orders.status} &middot; {formatUsd(p.orders.grand_total_cents)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
