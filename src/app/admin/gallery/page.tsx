import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { GalleryManager } from "@/components/admin/gallery/gallery-manager";

function tryGetAdmin() {
  try {
    return getSupabaseAdminClient();
  } catch {
    return null;
  }
}

export default async function AdminGalleryPage() {
  const supabase = tryGetAdmin();
  let projects: Array<Record<string, unknown>> = [];

  if (supabase) {
    const { data } = await supabase
      .from("gallery_projects")
      .select("*")
      .order("created_at", { ascending: false });
    projects = (data as Array<Record<string, unknown>>) ?? [];
  }

  return (
    <div className="space-y-6">
      <h1 className="[font-family:var(--font-display)] text-3xl text-primary">Gallery</h1>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <GalleryManager initialProjects={projects as any} />
    </div>
  );
}
