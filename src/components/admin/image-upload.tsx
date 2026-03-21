"use client";

import { useRef, useState } from "react";
import { Upload, X, GripVertical, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableImage({ url, index, isPrimary, onRemove, onMakePrimary }: {
  url: string; index: number; isPrimary: boolean;
  onRemove: () => void; onMakePrimary: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto" as const,
  };

  return (
    <div ref={setNodeRef} style={style}
      className={`group relative shrink-0 ${isDragging ? "ring-2 ring-accent shadow-lg" : ""} ${isPrimary ? "ring-2 ring-green-500" : ""}`}>
      <div {...attributes} {...listeners}
        className="size-24 overflow-hidden rounded-lg border cursor-grab active:cursor-grabbing sm:size-28">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={`Image ${index + 1}`} className="size-full object-cover" />
      </div>
      {/* Primary badge */}
      {isPrimary && (
        <div className="absolute -left-1 -top-1 rounded bg-green-600 px-1.5 py-0.5 text-[10px] font-bold text-white">PRIMARY</div>
      )}
      {/* Position */}
      <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">{index + 1}</div>
      {/* Grip handle */}
      <div className="absolute left-1 top-1 text-white/60"><GripVertical className="size-3.5" /></div>
      {/* Remove */}
      <button type="button" onClick={onRemove}
        className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] opacity-0 transition group-hover:opacity-100 hover:bg-red-600">
        <X className="size-3" />
      </button>
      {/* Make Primary */}
      {!isPrimary && (
        <button type="button" onClick={onMakePrimary}
          className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/80 flex items-center gap-0.5">
          <Star className="size-2.5" /> Primary
        </button>
      )}
    </div>
  );
}

export function ImageUpload({
  images,
  onChange,
  bucket = "product-images",
}: {
  images: string[];
  onChange: (images: string[]) => void;
  bucket?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", bucket);
      try {
        const res = await fetch("/api/admin/products/upload", { method: "POST", body: formData });
        if (res.ok) {
          const { url } = await res.json();
          onChange([...images, url]);
        } else {
          const { error } = await res.json().catch(() => ({ error: "Upload failed" }));
          toast.error(error);
        }
      } catch { toast.error("Upload failed"); }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = images.indexOf(active.id as string);
    const newIndex = images.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(images, oldIndex, newIndex));
  }

  function makePrimary(url: string) {
    onChange([url, ...images.filter((img) => img !== url)]);
  }

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">Drag to reorder — first image is the primary</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={images} strategy={horizontalListSortingStrategy}>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((url, i) => (
                  <SortableImage key={url} url={url} index={i} isPrimary={i === 0}
                    onRemove={() => onChange(images.filter((_, idx) => idx !== i))}
                    onMakePrimary={() => makePrimary(url)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}
      <div>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
          onChange={(e) => handleFiles(e.target.files)} />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Upload className="mr-2 size-4" /> {uploading ? "Uploading..." : "Upload Images"}
        </Button>
      </div>
    </div>
  );
}
