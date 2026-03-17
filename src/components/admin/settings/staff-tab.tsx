"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, KeyRound, Power, PowerOff } from "lucide-react";

interface StaffAccount {
  id: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

const ROLE_COLOR: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  staff: "bg-blue-100 text-blue-700",
  pos: "bg-purple-100 text-purple-700",
};

interface Props {
  initialStaff: StaffAccount[];
}

export function StaffTab({ initialStaff }: Props) {
  const [staff, setStaff] = useState<StaffAccount[]>(initialStaff);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ full_name: "", role: "pos", pin: "", pin2: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [resetPinId, setResetPinId] = useState<string | null>(null);
  const [newPin, setNewPin] = useState("");
  const [resetError, setResetError] = useState("");
  const [working, setWorking] = useState<string | null>(null);

  async function loadStaff() {
    const res = await fetch("/api/admin/staff");
    if (res.ok) {
      const d = await res.json();
      setStaff(d.staff ?? []);
    }
  }

  async function handleCreate() {
    setCreateError("");
    if (!form.full_name.trim()) { setCreateError("Name is required."); return; }
    if (!form.pin || form.pin.length < 4) { setCreateError("PIN must be at least 4 digits."); return; }
    if (!/^\d+$/.test(form.pin)) { setCreateError("PIN must be digits only."); return; }
    if (form.pin !== form.pin2) { setCreateError("PINs do not match."); return; }

    setCreating(true);
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: form.full_name, role: form.role, pin: form.pin }),
    });
    const d = await res.json();
    if (!res.ok) {
      setCreateError(d.error ?? "Failed to create staff.");
      setCreating(false);
      return;
    }
    setForm({ full_name: "", role: "pos", pin: "", pin2: "" });
    setShowCreate(false);
    setCreating(false);
    await loadStaff();
  }

  async function handleToggleActive(id: string, current: boolean) {
    setWorking(id);
    await fetch(`/api/admin/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !current }),
    });
    setWorking(null);
    await loadStaff();
  }

  async function handleResetPin(id: string) {
    setResetError("");
    if (!newPin || newPin.length < 4) { setResetError("PIN must be at least 4 digits."); return; }
    if (!/^\d+$/.test(newPin)) { setResetError("PIN must be digits only."); return; }

    setWorking(id);
    const res = await fetch(`/api/admin/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset_pin: newPin }),
    });
    const d = await res.json();
    if (!res.ok) {
      setResetError(d.error ?? "Failed to reset PIN.");
    } else {
      setResetPinId(null);
      setNewPin("");
    }
    setWorking(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Staff Accounts</h2>
          <p className="text-sm text-muted-foreground">
            Manage yard register access. Staff log in with Google or a PIN.
          </p>
        </div>
        <Button size="sm" onClick={() => { setShowCreate(true); setCreateError(""); }}>
          <Plus className="mr-1.5 size-3.5" />New Staff
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h3 className="font-medium text-sm">New Staff Account</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Name</label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="e.g. Mike Santos"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="pos">POS — register only</option>
                <option value="staff">Staff — register + limited admin</option>
                <option value="admin">Admin — full access</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">PIN (4–6 digits)</label>
              <Input
                type="password"
                inputMode="numeric"
                value={form.pin}
                onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value }))}
                placeholder="••••"
                maxLength={6}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Confirm PIN</label>
              <Input
                type="password"
                inputMode="numeric"
                value={form.pin2}
                onChange={(e) => setForm((f) => ({ ...f, pin2: e.target.value }))}
                placeholder="••••"
                maxLength={6}
              />
            </div>
          </div>
          {createError && (
            <p className="text-sm text-destructive">{createError}</p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Plus className="mr-1.5 size-3.5" />}
              Create
            </Button>
          </div>
        </div>
      )}

      {/* Staff list */}
      {staff.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No staff accounts yet. Create one to allow yard register access via PIN.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Added</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{s.full_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        ROLE_COLOR[s.role] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {s.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium ${
                        s.is_active ? "text-green-600" : "text-zinc-400"
                      }`}
                    >
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {/* Reset PIN */}
                      {resetPinId === s.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="password"
                            inputMode="numeric"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value)}
                            placeholder="New PIN"
                            className="w-24 h-7 text-xs"
                            maxLength={6}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            onClick={() => handleResetPin(s.id)}
                            disabled={working === s.id}
                          >
                            {working === s.id ? <Loader2 className="size-3 animate-spin" /> : "Save"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2"
                            onClick={() => { setResetPinId(null); setNewPin(""); setResetError(""); }}
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => { setResetPinId(s.id); setResetError(""); setNewPin(""); }}
                        >
                          <KeyRound className="mr-1 size-3" />PIN
                        </Button>
                      )}
                      {/* Toggle active */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => handleToggleActive(s.id, s.is_active)}
                        disabled={working === s.id}
                      >
                        {working === s.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : s.is_active ? (
                          <><PowerOff className="mr-1 size-3 text-zinc-400" />Deactivate</>
                        ) : (
                          <><Power className="mr-1 size-3 text-green-500" />Activate</>
                        )}
                      </Button>
                    </div>
                    {resetError && resetPinId === s.id && (
                      <p className="mt-1 text-xs text-destructive text-right">{resetError}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Staff with Google accounts (admin@easternbuilding.supply etc.) are managed via Supabase Auth.
        PIN accounts are for yard-only access — PINs are hashed and cannot be viewed.
      </p>
    </div>
  );
}
