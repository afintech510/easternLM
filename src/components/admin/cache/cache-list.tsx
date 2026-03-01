"use client";

import { useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
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

type CacheEntry = {
  id: number;
  address: string;
  one_way_miles: number;
  first_load_fee_cents: number;
  additional_load_fee_cents: number;
  is_local: boolean;
  is_out_of_range: boolean;
  expires_at: string;
  created_at: string;
};

export function CacheList({ initialEntries }: { initialEntries: CacheEntry[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [search, setSearch] = useState("");

  async function refreshEntries(q?: string) {
    const params = new URLSearchParams();
    if (q) params.set("search", q);
    const res = await fetch(`/api/admin/cache?${params}`);
    if (res.ok) {
      setEntries(await res.json());
    }
  }

  async function deleteEntry(id: number) {
    const res = await fetch(`/api/admin/cache?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success("Entry removed");
    } else {
      toast.error("Failed to remove");
    }
  }

  async function clearAll() {
    if (!confirm(`Clear all ${entries.length} cached entries?`)) return;
    const res = await fetch("/api/admin/cache", { method: "DELETE" });
    if (res.ok) {
      const data = await res.json();
      setEntries([]);
      toast.success(`${data.deleted} entries cleared`);
    } else {
      toast.error("Failed to clear cache");
    }
  }

  function handleSearch() {
    refreshEntries(search);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search addresses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={handleSearch}>Search</Button>
        <Button variant="destructive" onClick={clearAll} disabled={entries.length === 0}>
          Clear All ({entries.length})
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Address</TableHead>
              <TableHead>Distance</TableHead>
              <TableHead>1st Load</TableHead>
              <TableHead>Addl Load</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Cache is empty
                </TableCell>
              </TableRow>
            )}
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="max-w-[200px] truncate text-sm">{entry.address}</TableCell>
                <TableCell>{entry.one_way_miles} mi</TableCell>
                <TableCell>{formatUsd(entry.first_load_fee_cents)}</TableCell>
                <TableCell>{formatUsd(entry.additional_load_fee_cents)}</TableCell>
                <TableCell>
                  {entry.is_local && <Badge className="bg-green-100 text-green-800 text-xs">Local</Badge>}
                  {entry.is_out_of_range && <Badge className="bg-red-100 text-red-800 text-xs">OOR</Badge>}
                  {!entry.is_local && !entry.is_out_of_range && <Badge variant="outline" className="text-xs">Standard</Badge>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(entry.expires_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive"
                    onClick={() => deleteEntry(entry.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
