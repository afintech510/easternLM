"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Check } from "lucide-react";

interface Props {
  blob: Blob;
  onRetake: () => void;
  onAccept: () => void;
}

export function CapturePreview({ blob, onRetake, onAccept }: Props) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  if (!url) return null;

  return (
    <div className="flex h-screen flex-col bg-black">
      {/* Image */}
      <div className="flex-1 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Captured document" className="h-full w-full object-contain" />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-6 bg-black/90 px-4 pb-10 pt-6">
        <button
          onClick={onRetake}
          className="flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          <RotateCcw className="size-4" />
          Retake
        </button>
        <button
          onClick={onAccept}
          className="flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90"
        >
          <Check className="size-4" />
          Use Photo
        </button>
      </div>
    </div>
  );
}
