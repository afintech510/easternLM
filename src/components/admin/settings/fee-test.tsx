"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type FeeResult = {
  address: string;
  oneWayMiles: number;
  roundTripMiles: number;
  durationMinutes: number;
  fuelCost: number;
  laborCost: number;
  rawCost: number;
  firstLoadFee: number;
  additionalLoadFee: number;
  isLocal: boolean;
  isOutOfRange: boolean;
};

export function FeeTest() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FeeResult | null>(null);
  const [error, setError] = useState("");

  async function calculate() {
    if (!address.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    const res = await fetch("/api/admin/settings/fee-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });

    if (res.ok) {
      setResult(await res.json());
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to calculate");
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="size-5 text-accent" />
          Fee Test Tool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Customer Address</Label>
          <Input
            placeholder="123 Main St, Patchogue, NY"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && calculate()}
          />
        </div>
        <Button onClick={calculate} disabled={loading} className="w-full">
          {loading ? "Calculating…" : "Calculate Fee"}
        </Button>

        {error && (
          <p className="rounded border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {result && (
          <div className="space-y-3 rounded-lg bg-muted p-4 text-sm">
            <div className="flex items-center gap-2">
              {result.isLocal && <Badge className="bg-green-100 text-green-800">Local</Badge>}
              {result.isOutOfRange && <Badge className="bg-red-100 text-red-800">Out of Range</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-y-2">
              <span className="text-muted-foreground">One-way</span>
              <span className="text-right">{result.oneWayMiles} mi</span>
              <span className="text-muted-foreground">Round trip</span>
              <span className="text-right">{result.roundTripMiles} mi</span>
              <span className="text-muted-foreground">Duration</span>
              <span className="text-right">{result.durationMinutes} min</span>
              <span className="text-muted-foreground">Fuel cost</span>
              <span className="text-right">${result.fuelCost.toFixed(2)}</span>
              <span className="text-muted-foreground">Labor cost</span>
              <span className="text-right">${result.laborCost.toFixed(2)}</span>
              <span className="text-muted-foreground">Raw cost (×multiplier)</span>
              <span className="text-right">${result.rawCost.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between font-bold">
                <span>1st Load Fee</span>
                <span>${result.firstLoadFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Additional Load</span>
                <span>${result.additionalLoadFee.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
