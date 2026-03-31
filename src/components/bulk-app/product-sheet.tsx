"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export interface ProductSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  badge?: string | null;
  subtitle?: string;
}

/**
 * Bottom sheet wrapper with backdrop blur, slide-up animation, drag handle.
 * Spec §8.1
 */
export function ProductSheet({
  open,
  onClose,
  children,
  title,
  badge,
  subtitle,
}: ProductSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div data-testid="product-sheet" className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 flex max-h-[92vh] flex-col rounded-t-3xl bg-bulk-bg shadow-2xl transition-transform duration-300"
        style={{ animation: "slideUp 0.3s ease-out" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-bulk-border" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pb-3">
          <div className="flex-1 min-w-0">
            {badge && (
              <p className="text-[10px] font-semibold text-bulk-sage">
                ● {badge}
              </p>
            )}
            {title && (
              <h2 className="mt-0.5 font-bulk-display text-[22px] font-bold leading-tight text-bulk-text">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-[13px] leading-relaxed text-bulk-muted">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-3 mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-bulk-card text-bulk-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div
          className="flex-1 overflow-y-auto px-5 pb-6"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#e2dfd8 transparent" }}
        >
          {children}
        </div>
      </div>

      {/* Keyframe animation */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
