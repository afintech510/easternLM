"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Calendar, Clock, DollarSign, FileText, Loader2, MapPin,
  Phone, Plus, Truck, Upload, User, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/format";

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-blue-100 text-blue-700" },
  scheduled: { label: "Scheduled", color: "bg-purple-100 text-purple-700" },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
  on_hold: { label: "On Hold", color: "bg-gray-100 text-gray-600" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700" },
};

const PRIORITY_CFG: Record<string, string> = {
  urgent: "text-red-600", high: "text-orange-600", normal: "text-muted-foreground", low: "text-gray-400",
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "documents" | "deliveries" | "financials" | "activity" | "notes">("overview");
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadProject() {
    setLoading(true);
    const [pRes, aRes] = await Promise.all([
      fetch(`/api/admin/projects/${id}`),
      fetch(`/api/admin/projects/${id}/activity`),
    ]);
    if (pRes.ok) {
      const d = await pRes.json();
      setProject(d.project);
      setDeliveries(d.deliveries ?? []);
    }
    if (aRes.ok) {
      const d = await aRes.json();
      setActivity(d.activity ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { loadProject(); }, [id]);

  async function updateStatus(newStatus: string) {
    await fetch(`/api/admin/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    loadProject();
  }

  async function addNote() {
    if (!newNote.trim()) return;
    setSaving(true);
    await fetch(`/api/admin/projects/${id}/activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "note_added", description: newNote }),
    });
    setNewNote("");
    setSaving(false);
    loadProject();
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  if (!project) return <div className="p-6 text-destructive">Project not found.</div>;

  const statusCfg = STATUS_CFG[project.status] ?? STATUS_CFG.active;
  const docs: any[] = project.documents ?? [];

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "documents", label: `Documents (${docs.length})` },
    { key: "deliveries", label: `Deliveries (${deliveries.length})` },
    { key: "financials", label: "Financials" },
    { key: "activity", label: `Activity (${activity.length})` },
    { key: "notes", label: "Notes" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <Link href="/admin/projects" className="mt-1 text-muted-foreground hover:text-foreground"><ArrowLeft className="size-5" /></Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold">{project.project_number ?? "Project"}</h1>
            <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
            {project.priority && project.priority !== "normal" && (
              <span className={`text-xs font-semibold uppercase ${PRIORITY_CFG[project.priority]}`}>{project.priority}</span>
            )}
          </div>
          <h2 className="text-lg text-muted-foreground">{project.title}</h2>
          <div className="flex flex-wrap gap-4 mt-1 text-sm text-muted-foreground">
            {project.customer_name && <span className="flex items-center gap-1"><User className="size-3" /> {project.customer_name}</span>}
            {project.customer_phone && <a href={`tel:${project.customer_phone}`} className="flex items-center gap-1 hover:text-accent"><Phone className="size-3" /> {project.customer_phone}</a>}
            {project.address && <span className="flex items-center gap-1"><MapPin className="size-3" /> {project.address}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={project.status}
            onChange={(e) => updateStatus(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          >
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Financial summary bar */}
      {project.quote_total_cents > 0 && (
        <div className="rounded-lg border bg-card p-4 flex flex-wrap items-center gap-6 text-sm">
          <div><span className="text-muted-foreground">Quote:</span> <span className="font-semibold">{formatUsd(project.quote_total_cents)}</span></div>
          <div><span className="text-muted-foreground">Deposit:</span> <span className="font-semibold text-green-600">{formatUsd(project.deposit_cents ?? 0)}</span></div>
          <div><span className="text-muted-foreground">Paid:</span> <span className="font-semibold">{formatUsd(project.paid_cents ?? 0)}</span></div>
          <div><span className="text-muted-foreground">Balance:</span> <span className="font-semibold text-amber-600">{formatUsd(project.balance_due_cents ?? 0)}</span></div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b pb-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`shrink-0 rounded-t-md px-4 py-2 text-sm font-medium transition-colors ${tab === t.key ? "border-b-2 border-accent text-accent" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {project.description && (
              <div className="rounded-lg border bg-card p-4">
                <h3 className="text-sm font-semibold mb-2">Description</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description}</p>
              </div>
            )}
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <h3 className="text-sm font-semibold">Details</h3>
              {project.service_type && <p className="text-sm"><span className="text-muted-foreground">Service:</span> {project.service_type}</p>}
              {project.scheduled_date && <p className="text-sm"><span className="text-muted-foreground">Scheduled:</span> {project.scheduled_date}</p>}
              {project.estimated_days && <p className="text-sm"><span className="text-muted-foreground">Est. days:</span> {project.estimated_days}</p>}
              {project.assigned_crew?.length > 0 && <p className="text-sm"><span className="text-muted-foreground">Crew:</span> {project.assigned_crew.join(", ")}</p>}
            </div>
          </div>
          <div className="space-y-4">
            {project.quote_id && (
              <Link href={`/admin/quotes/${project.quote_id}`} className="flex items-center gap-2 rounded-lg border bg-card p-4 hover:border-accent/30 transition-colors">
                <FileText className="size-5 text-accent" />
                <div>
                  <p className="font-medium text-sm">Linked Quote</p>
                  <p className="text-xs text-muted-foreground">{project.quotes?.quote_number ?? project.quote_id.slice(0, 8)}</p>
                </div>
              </Link>
            )}
            {project.order_id && (
              <Link href="/admin/operations" className="flex items-center gap-2 rounded-lg border bg-card p-4 hover:border-accent/30 transition-colors">
                <DollarSign className="size-5 text-accent" />
                <div>
                  <p className="font-medium text-sm">Linked Order</p>
                  <p className="text-xs text-muted-foreground">{project.order_id.slice(0, 8)}</p>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      {tab === "documents" && (
        <div className="space-y-4">
          {docs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No documents yet.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {docs.map((doc: any, i: number) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-muted-foreground">{doc.date ? new Date(doc.date).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-2"><Badge variant="outline" className="text-xs">{doc.type}</Badge></td>
                      <td className="px-4 py-2 font-medium">{doc.name}</td>
                      <td className="px-4 py-2 text-right">
                        {doc.url && <a href={doc.url} target="_blank" rel="noreferrer" className="text-accent hover:underline text-xs">View</a>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "deliveries" && (
        <div className="space-y-3">
          {deliveries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No deliveries linked.</p>
          ) : (
            deliveries.map((d: any) => (
              <div key={d.id} className="rounded-lg border bg-card p-4 flex items-center gap-4">
                <Truck className="size-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{d.material_summary}</p>
                  <p className="text-xs text-muted-foreground">{d.delivery_date} &middot; {d.truck_type} &middot; {d.destination_town ?? d.destination_address}</p>
                </div>
                <Badge variant="outline" className="text-xs">{d.status}</Badge>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "financials" && (
        <div className="rounded-lg border bg-card p-6 space-y-3 max-w-md">
          <h3 className="font-semibold">Financial Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Quote total</span><span>{formatUsd(project.quote_total_cents ?? 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Deposit received</span><span className="text-green-600">-{formatUsd(project.deposit_cents ?? 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Additional payments</span><span>-{formatUsd((project.paid_cents ?? 0) - (project.deposit_cents ?? 0))}</span></div>
            <div className="flex justify-between border-t pt-2 font-semibold"><span>Balance due</span><span className="text-amber-600">{formatUsd(project.balance_due_cents ?? 0)}</span></div>
          </div>
        </div>
      )}

      {tab === "activity" && (
        <div className="space-y-3">
          {/* Add note */}
          <div className="flex gap-2">
            <Input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note..." onKeyDown={(e) => e.key === "Enter" && addNote()} />
            <Button size="sm" onClick={addNote} disabled={saving || !newNote.trim()}>
              {saving ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />} Add
            </Button>
          </div>
          {activity.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <div className="space-y-2">
              {activity.map((a: any) => (
                <div key={a.id} className="flex gap-3 text-sm">
                  <div className="mt-1 size-2 rounded-full bg-accent shrink-0" />
                  <div>
                    <p className="text-muted-foreground">{a.description}</p>
                    <p className="text-xs text-muted-foreground/60">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "notes" && (
        <div className="rounded-lg border bg-card p-4">
          <textarea
            value={project.notes ?? ""}
            onChange={async (e) => {
              const val = e.target.value;
              setProject((p: any) => ({ ...p, notes: val }));
            }}
            onBlur={async () => {
              await fetch(`/api/admin/projects/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notes: project.notes }),
              });
            }}
            placeholder="Job notes, instructions, change orders..."
            className="w-full min-h-[200px] bg-transparent text-sm focus:outline-none resize-y"
          />
        </div>
      )}
    </div>
  );
}
