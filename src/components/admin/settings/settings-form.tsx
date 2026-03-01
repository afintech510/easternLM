"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Settings = {
  origin_address: string;
  miles_per_gallon: number;
  fuel_price_per_gallon: number;
  hourly_labor_rate: number;
  dump_time_buffer_minutes: number;
  profit_multiplier: number;
  round_to_nearest: number;
  minimum_delivery_fee_cents: number;
  additional_load_discount: number;
  minimum_order_cents: number;
  local_radius_miles: number;
  max_service_radius_miles: number;
  tax_rate: number;
  cc_surcharge_rate: number;
  same_day_cutoff_hour: number;
  timezone: string;
  operating_days: string[];
  blackout_dates: string[];
  max_loads_per_day_per_address: number;
  pro_discount_rate: number;
  pro_discount_pickup_only: boolean;
};

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function SettingsForm({ initialSettings }: { initialSettings: Settings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      toast.success("Settings saved");
    } else {
      toast.error("Failed to save settings");
    }
    setSaving(false);
  }

  return (
    <Tabs defaultValue="delivery" className="space-y-4">
      <TabsList>
        <TabsTrigger value="delivery">Delivery Pricing</TabsTrigger>
        <TabsTrigger value="tax">Tax & Fees</TabsTrigger>
        <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
        <TabsTrigger value="pro">Pro Program</TabsTrigger>
      </TabsList>

      <TabsContent value="delivery">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Origin Address</Label>
              <Input value={settings.origin_address} onChange={(e) => update("origin_address", e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Fuel Price ($/gal)</Label>
                <Input type="number" step="0.01" value={settings.fuel_price_per_gallon} onChange={(e) => update("fuel_price_per_gallon", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Miles per Gallon</Label>
                <Input type="number" step="0.1" value={settings.miles_per_gallon} onChange={(e) => update("miles_per_gallon", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Hourly Labor Rate ($)</Label>
                <Input type="number" step="0.01" value={settings.hourly_labor_rate} onChange={(e) => update("hourly_labor_rate", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Profit Multiplier</Label>
                <Input type="number" step="0.1" value={settings.profit_multiplier} onChange={(e) => update("profit_multiplier", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Round to Nearest ($)</Label>
                <Input type="number" value={settings.round_to_nearest} onChange={(e) => update("round_to_nearest", parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Min Delivery Fee (cents)</Label>
                <Input type="number" value={settings.minimum_delivery_fee_cents} onChange={(e) => update("minimum_delivery_fee_cents", parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Addl Load Discount (%)</Label>
                <Input type="number" step="0.01" value={Math.round(settings.additional_load_discount * 100)} onChange={(e) => update("additional_load_discount", (parseFloat(e.target.value) || 0) / 100)} />
              </div>
              <div className="space-y-2">
                <Label>Min Order (cents)</Label>
                <Input type="number" value={settings.minimum_order_cents} onChange={(e) => update("minimum_order_cents", parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Local Radius (miles)</Label>
                <Input type="number" step="0.5" value={settings.local_radius_miles} onChange={(e) => update("local_radius_miles", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Max Service Radius (miles)</Label>
                <Input type="number" step="0.5" value={settings.max_service_radius_miles} onChange={(e) => update("max_service_radius_miles", parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="tax">
        <Card>
          <CardHeader>
            <CardTitle>Tax & Fees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tax Rate (%)</Label>
                <Input type="number" step="0.01" value={Math.round(settings.tax_rate * 10000) / 100} onChange={(e) => update("tax_rate", (parseFloat(e.target.value) || 0) / 100)} />
              </div>
              <div className="space-y-2">
                <Label>CC Surcharge (%)</Label>
                <Input type="number" step="0.01" value={Math.round(settings.cc_surcharge_rate * 10000) / 100} onChange={(e) => update("cc_surcharge_rate", (parseFloat(e.target.value) || 0) / 100)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="scheduling">
        <Card>
          <CardHeader>
            <CardTitle>Scheduling</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Same-Day Cutoff Hour (0-23)</Label>
                <Input type="number" min="0" max="23" value={settings.same_day_cutoff_hour} onChange={(e) => update("same_day_cutoff_hour", parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input value={settings.timezone} onChange={(e) => update("timezone", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Max Loads/Day/Address</Label>
                <Input type="number" min="1" value={settings.max_loads_per_day_per_address} onChange={(e) => update("max_loads_per_day_per_address", parseInt(e.target.value) || 1)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Operating Days</Label>
              <div className="flex flex-wrap gap-3">
                {ALL_DAYS.map((day) => (
                  <label key={day} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={settings.operating_days.includes(day)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          update("operating_days", [...settings.operating_days, day]);
                        } else {
                          update("operating_days", settings.operating_days.filter((d) => d !== day));
                        }
                      }}
                      className="rounded"
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Blackout Dates (YYYY-MM-DD, comma-separated)</Label>
              <Input
                value={settings.blackout_dates.join(", ")}
                onChange={(e) =>
                  update("blackout_dates", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))
                }
                placeholder="2026-12-25, 2026-01-01"
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="pro">
        <Card>
          <CardHeader>
            <CardTitle>Pro Program</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Pro Discount Rate (%)</Label>
                <Input type="number" step="0.1" value={Math.round(settings.pro_discount_rate * 1000) / 10} onChange={(e) => update("pro_discount_rate", (parseFloat(e.target.value) || 0) / 100)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.pro_discount_pickup_only}
                onCheckedChange={(v) => update("pro_discount_pickup_only", v)}
              />
              <Label>Pro discount applies to pickup only</Label>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
        {saving ? "Saving…" : "Save Settings"}
      </Button>
    </Tabs>
  );
}
