"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatUsd } from "@/lib/format";

const STATUSES = ["pending", "paid", "processing", "scheduled", "delivered", "cancelled"] as const;

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price_cents: number;
  line_subtotal_cents: number;
  delivery_type: string | null;
  material_class: string | null;
  load_number: number | null;
  delivery_day: number | null;
};

type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  status: string;
  delivery_method: string;
  delivery_address: string | null;
  delivery_zip: string | null;
  materials_subtotal_cents: number;
  delivery_total_cents: number;
  tax_cents: number;
  cc_surcharge_cents: number;
  grand_total_cents: number;
  distance_meters: number | null;
  first_load_fee_cents: number | null;
  additional_load_fee_cents: number | null;
  total_loads: number;
  total_delivery_days: number;
  access_constraints: Record<string, unknown>;
  delivery_schedule: unknown[];
  placed_at: string;
  order_items: OrderItem[];
};

export function OrderDetail({ order }: { order: Order }) {
  const [status, setStatus] = useState(order.status);
  const [saving, setSaving] = useState(false);

  async function updateStatus(newStatus: string) {
    setSaving(true);
    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.ok) {
      setStatus(newStatus);
      toast.success(`Status updated to ${newStatus}`);
    } else {
      toast.error("Failed to update status");
    }
    setSaving(false);
  }

  const oneWayMiles = order.distance_meters
    ? Math.round((order.distance_meters / 1609.34) * 10) / 10
    : null;

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Orders
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main content */}
        <div className="space-y-6">
          {/* Customer info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{order.customer_name}</p>
              <p className="text-muted-foreground">{order.customer_email}</p>
              {order.customer_phone && (
                <p className="text-muted-foreground">{order.customer_phone}</p>
              )}
              {order.delivery_address && (
                <div className="pt-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Delivery Address</p>
                  <p>{order.delivery_address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Subtotal</TableHead>
                    <TableHead>Load</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.order_items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell>{item.quantity} {item.unit}</TableCell>
                      <TableCell>{formatUsd(item.unit_price_cents)}</TableCell>
                      <TableCell>{formatUsd(item.line_subtotal_cents)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.load_number != null ? `L${item.load_number}` : "—"}
                        {item.delivery_day != null ? ` / D${item.delivery_day}` : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Access constraints */}
          {Object.keys(order.access_constraints).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Access Constraints</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="rounded bg-muted p-3 text-xs">
                  {JSON.stringify(order.access_constraints, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge className="text-sm capitalize">{status}</Badge>
              <Select value={status} onValueChange={updateStatus} disabled={saving}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Materials</span>
                <span>{formatUsd(order.materials_subtotal_cents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span>{formatUsd(order.delivery_total_cents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatUsd(order.tax_cents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CC Surcharge</span>
                <span>{formatUsd(order.cc_surcharge_cents)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold">
                <span>Total</span>
                <span>{formatUsd(order.grand_total_cents)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Delivery info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delivery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="capitalize">{order.delivery_method}</span>
              </div>
              {oneWayMiles !== null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Distance</span>
                  <span>{oneWayMiles} mi</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Loads</span>
                <span>{order.total_loads}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Days</span>
                <span>{order.total_delivery_days}</span>
              </div>
              {order.first_load_fee_cents != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">1st Load Fee</span>
                  <span>{formatUsd(order.first_load_fee_cents)}</span>
                </div>
              )}
              {order.additional_load_fee_cents != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Addl Load Fee</span>
                  <span>{formatUsd(order.additional_load_fee_cents)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            Placed {new Date(order.placed_at).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
