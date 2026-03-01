"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatUsd } from "@/lib/format";

const STATUS_TABS = ["all", "pending", "paid", "processing", "scheduled", "delivered", "cancelled"] as const;

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  scheduled: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  status: string;
  delivery_method: string;
  grand_total_cents: number;
  placed_at: string;
  order_items: Array<{ id: string }>;
};

export function OrderList({
  initialOrders,
  initialTotal,
}: {
  initialOrders: Order[];
  initialTotal: number;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [total, setTotal] = useState(initialTotal);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  async function fetchOrders(newPage: number, status: string, q: string) {
    setLoading(true);
    const params = new URLSearchParams({ page: newPage.toString() });
    if (status !== "all") params.set("status", status);
    if (q) params.set("search", q);

    const res = await fetch(`/api/admin/orders?${params}`);
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders);
      setTotal(data.total);
      setPage(data.page);
    }
    setLoading(false);
  }

  function handleStatusChange(status: string) {
    setStatusFilter(status);
    fetchOrders(1, status, search);
  }

  function handleSearch() {
    fetchOrders(1, statusFilter, search);
  }

  const totalPages = Math.ceil(total / 25);

  return (
    <div className="space-y-4">
      {/* Status tabs */}
      <div className="flex flex-wrap gap-1">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab}
            variant={statusFilter === tab ? "default" : "ghost"}
            size="sm"
            onClick={() => handleStatusChange(tab)}
            className="capitalize"
          >
            {tab}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={handleSearch}>Search</Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {loading ? "Loading…" : "No orders found"}
                </TableCell>
              </TableRow>
            )}
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-mono text-sm text-accent hover:underline"
                  >
                    {order.id.slice(0, 8)}…
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{order.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{order.customer_email}</div>
                </TableCell>
                <TableCell>
                  <Badge className={`text-xs ${statusColors[order.status] ?? ""}`}>
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className="capitalize text-sm">
                  {order.delivery_method}
                </TableCell>
                <TableCell className="font-medium">
                  {formatUsd(order.grand_total_cents)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(order.placed_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {total} orders total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => fetchOrders(page - 1, statusFilter, search)}
            >
              Previous
            </Button>
            <span className="flex items-center text-sm">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => fetchOrders(page + 1, statusFilter, search)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
