"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { galleryProjectSchema, type GalleryProjectFormValues } from "@/lib/admin/schemas";
import { ImageUpload } from "../image-upload";

type GalleryProject = {
  id: string;
  title: string;
  description: string;
  images: string[];
  town_tags: string[];
  service_type: string;
  before_after: boolean;
  is_featured: boolean;
};

const SERVICE_TYPES = ["landscaping", "masonry", "driveways", "maintenance"];

export function GalleryManager({ initialProjects }: { initialProjects: GalleryProject[] }) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [editing, setEditing] = useState<GalleryProject | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  async function deleteProject(project: GalleryProject) {
    if (!confirm(`Delete "${project.title}"?`)) return;
    const res = await fetch(`/api/admin/gallery/${project.id}`, { method: "DELETE" });
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      toast.success("Project deleted");
    } else {
      toast.error("Failed to delete");
    }
  }

  function handleSaved() {
    setEditing(null);
    setIsCreateOpen(false);
    fetch("/api/admin/gallery")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setProjects(data); });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 size-4" /> Add Project
        </Button>
      </div>

      {projects.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">No gallery projects yet.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardContent className="p-4 space-y-2">
              {project.images[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={project.images[0]}
                  alt={project.title}
                  className="h-32 w-full rounded-lg object-cover"
                />
              )}
              <h3 className="font-medium">{project.title}</h3>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs capitalize">{project.service_type}</Badge>
                {project.is_featured && <Badge className="text-xs">Featured</Badge>}
                {project.before_after && <Badge variant="secondary" className="text-xs">B/A</Badge>}
              </div>
              {project.town_tags.length > 0 && (
                <p className="text-xs text-muted-foreground">{project.town_tags.join(", ")}</p>
              )}
              <div className="flex gap-1 pt-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(project)}>
                  <Pencil className="mr-1 size-3" /> Edit
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteProject(project)}>
                  <Trash2 className="mr-1 size-3" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isCreateOpen || !!editing} onOpenChange={(open) => { if (!open) { setIsCreateOpen(false); setEditing(null); } }}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Project" : "Add Project"}</DialogTitle>
          </DialogHeader>
          <GalleryForm project={editing} onSaved={handleSaved} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GalleryForm({ project, onSaved }: { project: GalleryProject | null; onSaved: () => void }) {
  const isEdit = !!project;
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<GalleryProjectFormValues>({
    resolver: zodResolver(galleryProjectSchema),
    defaultValues: project
      ? { title: project.title, description: project.description, images: project.images, town_tags: project.town_tags, service_type: project.service_type, before_after: project.before_after, is_featured: project.is_featured }
      : { title: "", description: "", images: [], town_tags: [], service_type: "landscaping", before_after: false, is_featured: false },
  });

  const images = watch("images");

  async function onSubmit(values: GalleryProjectFormValues) {
    const url = isEdit ? `/api/admin/gallery/${project!.id}` : "/api/admin/gallery";
    const method = isEdit ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    if (res.ok) {
      toast.success(isEdit ? "Project updated" : "Project created");
      onSaved();
    } else {
      toast.error("Failed to save");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input {...register("title")} />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea rows={3} {...register("description")} />
      </div>
      <div className="space-y-2">
        <Label>Service Type</Label>
        <Select value={watch("service_type")} onValueChange={(v) => setValue("service_type", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {SERVICE_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Images</Label>
        <ImageUpload images={images} onChange={(imgs) => setValue("images", imgs)} bucket="gallery-projects" />
      </div>
      <div className="space-y-2">
        <Label>Town Tags (comma-separated)</Label>
        <Input
          defaultValue={watch("town_tags").join(", ")}
          onChange={(e) => setValue("town_tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
          placeholder="Moriches, Patchogue, Shirley"
        />
      </div>
      <div className="flex gap-6">
        <div className="flex items-center gap-2">
          <Switch checked={watch("before_after")} onCheckedChange={(v) => setValue("before_after", v)} />
          <Label>Before/After</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={watch("is_featured")} onCheckedChange={(v) => setValue("is_featured", v)} />
          <Label>Featured</Label>
        </div>
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving…" : isEdit ? "Update" : "Create Project"}
      </Button>
    </form>
  );
}
