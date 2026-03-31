"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { productSchema, type ProductFormValues } from "@/lib/admin/schemas";
import { ImageUpload } from "../image-upload";

type Category = { id: string; name: string; slug: string };

type ProductData = {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  delivery_type: string;
  material_class: string;
  price_per_unit_cents: number;
  unit: string;
  unit_display: string;
  min_qty: number;
  max_qty: number;
  step_qty: number;
  description: string;
  images: string[];
  recommended_uses: string[];
  pairs_well_with: string[];
  pallet_qty: number | null;
  pallet_price_cents: number | null;
  is_taxable: boolean;
  is_active: boolean;
  visible_web: boolean;
  visible_pos: boolean;
  sort_order: number;
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ProductForm({
  categories,
  product,
  onSaved,
  compact,
}: {
  categories: Category[];
  product?: ProductData;
  onSaved: () => void;
  compact?: boolean;
}) {
  const isEdit = !!product;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          name: product.name,
          slug: product.slug,
          category_id: product.category_id,
          delivery_type: product.delivery_type as "bulk" | "non-bulk",
          material_class: product.material_class as "mulch" | "default",
          price_per_unit_cents: product.price_per_unit_cents,
          unit: product.unit,
          unit_display: product.unit_display,
          min_qty: product.min_qty,
          max_qty: product.max_qty,
          step_qty: product.step_qty,
          pallet_qty: product.pallet_qty ?? null,
          pallet_price_cents: product.pallet_price_cents ?? null,
          description: product.description,
          images: product.images,
          recommended_uses: product.recommended_uses,
          pairs_well_with: product.pairs_well_with,
          is_taxable: product.is_taxable,
          is_active: product.is_active,
          visible_web: product.visible_web ?? true,
          visible_pos: product.visible_pos ?? true,
          sort_order: product.sort_order,
        }
      : {
          name: "",
          slug: "",
          category_id: "",
          delivery_type: "bulk",
          material_class: "default",
          price_per_unit_cents: 0,
          unit: "yard",
          unit_display: "per yard",
          min_qty: 1,
          max_qty: 100,
          step_qty: 0.5,
          pallet_qty: null,
          pallet_price_cents: null,
          description: "",
          images: [],
          recommended_uses: [],
          pairs_well_with: [],
          is_taxable: true,
          is_active: true,
          visible_web: true,
          visible_pos: true,
          sort_order: 100,
        },
  });

  const images = watch("images");

  async function onSubmit(values: ProductFormValues) {
    const url = isEdit ? `/api/admin/products/${product!.id}` : "/api/admin/products";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (res.ok) {
      toast.success(isEdit ? "Product updated" : "Product created");
      onSaved();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ? JSON.stringify(data.error) : "Failed to save product");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            {...register("name", {
              onChange: (e) => {
                if (!isEdit) setValue("slug", slugify(e.target.value));
              },
            })}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" {...register("slug")} />
          {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={watch("category_id")}
            onValueChange={(v) => setValue("category_id", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category_id && (
            <p className="text-xs text-destructive">{errors.category_id.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Delivery Type</Label>
          <Select
            value={watch("delivery_type")}
            onValueChange={(v) => setValue("delivery_type", v as "bulk" | "non-bulk")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bulk">Bulk</SelectItem>
              <SelectItem value="non-bulk">Non-Bulk</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Material Class</Label>
          <Select
            value={watch("material_class")}
            onValueChange={(v) => setValue("material_class", v as "mulch" | "default")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="mulch">Mulch</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price (cents)</Label>
          <Input
            id="price"
            type="number"
            {...register("price_per_unit_cents", { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit">Unit</Label>
          <Input id="unit" {...register("unit")} placeholder="yard" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unitDisplay">Unit Display</Label>
          <Input id="unitDisplay" {...register("unit_display")} placeholder="per yard" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sortOrder">Sort Order</Label>
          <Input
            id="sortOrder"
            type="number"
            {...register("sort_order", { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="minQty">Min Qty</Label>
          <Input id="minQty" type="number" step="0.5" {...register("min_qty", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxQty">Max Qty</Label>
          <Input id="maxQty" type="number" step="0.5" {...register("max_qty", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stepQty">Step Qty</Label>
          <Input id="stepQty" type="number" step="0.5" {...register("step_qty", { valueAsNumber: true })} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="palletQty">Pallet Qty (units per pallet)</Label>
          <Input id="palletQty" type="number" step="1" placeholder="e.g. 40, 108" {...register("pallet_qty", { setValueAs: (v: string) => v === "" ? null : Number(v) })} />
          <p className="text-xs text-muted-foreground">Leave blank if product is not sold by the pallet</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="palletPrice">Pallet Price (cents per unit)</Label>
          <Input id="palletPrice" type="number" step="1" placeholder="e.g. 850 = $8.50/unit" {...register("pallet_price_cents", { setValueAs: (v: string) => v === "" ? null : Number(v) })} />
          <p className="text-xs text-muted-foreground">Discounted per-unit price when buying a full pallet</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={3} {...register("description")} />
      </div>

      <div className="space-y-2">
        <Label>Images</Label>
        <ImageUpload
          images={images}
          onChange={(imgs) => setValue("images", imgs)}
          bucket="product-images"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="recommendedUses">Recommended Uses (comma-separated)</Label>
        <Input
          id="recommendedUses"
          defaultValue={watch("recommended_uses").join(", ")}
          onChange={(e) =>
            setValue(
              "recommended_uses",
              e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
            )
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pairsWellWith">Pairs Well With (slugs, comma-separated)</Label>
        <Input
          id="pairsWellWith"
          defaultValue={watch("pairs_well_with").join(", ")}
          onChange={(e) =>
            setValue(
              "pairs_well_with",
              e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
            )
          }
        />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold">Visibility</p>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch
              id="visibleWeb"
              checked={watch("visible_web")}
              onCheckedChange={(v) => setValue("visible_web", v)}
            />
            <Label htmlFor="visibleWeb">Show on Web Store</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="visiblePos"
              checked={watch("visible_pos")}
              onCheckedChange={(v) => setValue("visible_pos", v)}
            />
            <Label htmlFor="visiblePos">Show on POS</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="isTaxable"
              checked={watch("is_taxable")}
              onCheckedChange={(v) => setValue("is_taxable", v)}
            />
            <Label htmlFor="isTaxable">Taxable</Label>
          </div>
        </div>
        {!watch("visible_web") && !watch("visible_pos") && (
          <p className="text-xs text-destructive">This product is hidden from all channels.</p>
        )}
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive space-y-1">
          <p className="font-medium">Please fix the following:</p>
          {Object.entries(errors).map(([field, err]) => (
            <p key={field} className="text-xs">• {field}: {(err as { message?: string })?.message ?? "Invalid"}</p>
          ))}
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving…" : isEdit ? "Update Product" : "Create Product"}
      </Button>
    </form>
  );
}
