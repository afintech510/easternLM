"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { truckTypeSchema, type TruckTypeFormValues } from "@/lib/admin/schemas";

type Truck = {
  id: string;
  name: string;
  capacity_mulch: number;
  capacity_default: number;
  sort_order: number;
  is_active: boolean;
};

export function TruckList({ initialTrucks }: { initialTrucks: Truck[] }) {
  const router = useRouter();
  const [trucks, setTrucks] = useState(initialTrucks);
  const [editing, setEditing] = useState<Truck | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  async function deleteTruck(truck: Truck) {
    if (!confirm(`Delete "${truck.name}"?`)) return;
    const res = await fetch(`/api/admin/trucks/${truck.id}`, { method: "DELETE" });
    if (res.ok) {
      setTrucks((prev) => prev.filter((t) => t.id !== truck.id));
      toast.success(`${truck.name} deleted`);
    } else {
      toast.error("Failed to delete truck");
    }
  }

  function handleSaved() {
    setEditing(null);
    setIsCreateOpen(false);
    fetch("/api/admin/trucks")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setTrucks(data); });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 size-4" /> Add Truck
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Mulch Capacity (yds)</TableHead>
              <TableHead>Default Capacity (yds)</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trucks.map((truck) => (
              <TableRow key={truck.id} className={!truck.is_active ? "opacity-50" : ""}>
                <TableCell className="font-medium">{truck.name}</TableCell>
                <TableCell>{truck.capacity_mulch}</TableCell>
                <TableCell>{truck.capacity_default}</TableCell>
                <TableCell>{truck.sort_order}</TableCell>
                <TableCell>
                  <Badge variant={truck.is_active ? "default" : "secondary"} className="text-xs">
                    {truck.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(truck)}>Edit</Button>
                    <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => deleteTruck(truck)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isCreateOpen || !!editing} onOpenChange={(open) => { if (!open) { setIsCreateOpen(false); setEditing(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Truck" : "Add Truck"}</DialogTitle>
          </DialogHeader>
          <TruckForm truck={editing} onSaved={handleSaved} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TruckForm({ truck, onSaved }: { truck: Truck | null; onSaved: () => void }) {
  const isEdit = !!truck;
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<TruckTypeFormValues>({
    resolver: zodResolver(truckTypeSchema),
    defaultValues: truck
      ? { name: truck.name, capacity_mulch: truck.capacity_mulch, capacity_default: truck.capacity_default, sort_order: truck.sort_order, is_active: truck.is_active }
      : { name: "", capacity_mulch: 10, capacity_default: 10, sort_order: 100, is_active: true },
  });

  async function onSubmit(values: TruckTypeFormValues) {
    const url = isEdit ? `/api/admin/trucks/${truck!.id}` : "/api/admin/trucks";
    const method = isEdit ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });

    if (res.ok) {
      toast.success(isEdit ? "Truck updated" : "Truck added");
      onSaved();
    } else {
      toast.error("Failed to save");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="grid gap-4 grid-cols-2">
        <div className="space-y-2">
          <Label>Mulch Capacity (yards)</Label>
          <Input type="number" step="0.5" {...register("capacity_mulch", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label>Default Capacity (yards)</Label>
          <Input type="number" step="0.5" {...register("capacity_default", { valueAsNumber: true })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Sort Order</Label>
        <Input type="number" {...register("sort_order", { valueAsNumber: true })} />
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={watch("is_active")} onCheckedChange={(v) => setValue("is_active", v)} />
        <Label>Active</Label>
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving…" : isEdit ? "Update" : "Add Truck"}
      </Button>
    </form>
  );
}
