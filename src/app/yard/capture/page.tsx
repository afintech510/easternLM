"use client";

import { useState, useRef } from "react";
import { Camera, Check, Loader2, Upload, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const TAGS = [
  { label: "Product", value: "product", color: "bg-amber-500" },
  { label: "Delivery", value: "delivery", color: "bg-sky-500" },
  { label: "Project", value: "project", color: "bg-emerald-500" },
  { label: "Behind Scenes", value: "behind_scenes", color: "bg-purple-500" },
];

type UploadState = "idle" | "selecting" | "uploading" | "success" | "error";

export default function PhotoCapturePage() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTag) return;

    // Preview
    const url = URL.createObjectURL(file);
    setPreview(url);
    setState("uploading");
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `raw/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("marketing-assets")
        .upload(path, file, { contentType: file.type });

      if (uploadError) throw new Error(uploadError.message);

      // Get brand ID for the asset record (mktg_* tables not in generated types yet)
      const { data: brand } = await (supabase as any)
        .from("mktg_brands")
        .select("id")
        .eq("slug", "eastern-lm")
        .single();

      if (brand) {
        await (supabase as any).from("mktg_image_assets").insert({
          brand_id: brand.id,
          asset_type: "raw_upload",
          storage_path: path,
          tags: [selectedTag],
          original_filename: file.name,
          file_size_bytes: file.size,
        });
      }

      setState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setState("error");
    }
  };

  const reset = () => {
    setState("idle");
    setSelectedTag(null);
    setPreview(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Camera className="mx-auto h-10 w-10 text-primary mb-2" />
          <h1 className="text-xl font-semibold">Eastern LM</h1>
          <p className="text-sm text-muted-foreground">Yard Photo Capture</p>
        </div>

        {state === "success" ? (
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <p className="font-medium">Photo uploaded!</p>
            <p className="text-sm text-muted-foreground">
              It will appear in next week&apos;s content.
            </p>
            <Button onClick={reset} className="w-full" size="lg">
              Take Another
            </Button>
          </div>
        ) : (
          <>
            {/* Tag Selection */}
            <div>
              <p className="text-sm font-medium mb-2">What is this photo of?</p>
              <div className="grid grid-cols-2 gap-3">
                {TAGS.map(tag => (
                  <button
                    key={tag.value}
                    onClick={() => setSelectedTag(tag.value)}
                    className={`flex items-center gap-2 rounded-lg border-2 p-4 text-left transition-all ${
                      selectedTag === tag.value
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/50"
                    }`}
                  >
                    <div className={`h-3 w-3 rounded-full ${tag.color}`} />
                    <span className="text-sm font-medium">{tag.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {preview && (
              <div className="rounded-lg overflow-hidden border">
                <img src={preview} alt="Preview" className="w-full h-48 object-cover" />
              </div>
            )}

            {/* Camera Input */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              className="hidden"
            />

            <Button
              onClick={() => fileRef.current?.click()}
              disabled={!selectedTag || state === "uploading"}
              className="w-full"
              size="lg"
            >
              {state === "uploading" ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="mr-2 h-5 w-5" /> Take Photo</>
              )}
            </Button>

            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
