"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

const STORAGE_KEY = "elm_popup_dismissed";

export function PromoPopup() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    // Only show on homepage
    if (pathname !== "/") return;

    const timer = setTimeout(() => setShow(true), 30000); // 30 seconds
    return () => clearTimeout(timer);
  }, [pathname]);

  function dismiss() {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, "1");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;

    setStatus("loading");
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact: phone.trim(), source: "popup-discount" }),
    });

    if (res.ok) {
      setStatus("success");
      setMessage("Check your phone for your discount code!");
      localStorage.setItem(STORAGE_KEY, "1");
      setTimeout(() => setShow(false), 4000);
    } else {
      const data = await res.json();
      setStatus("error");
      setMessage(data.error || "Something went wrong.");
    }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl">
        <button onClick={dismiss} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="h-5 w-5" />
        </button>

        {status === "success" ? (
          <div className="py-4 text-center">
            <p className="text-lg font-bold text-green-600">{message}</p>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-bold text-primary">Want 5% off your first online order?</h3>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setStatus("idle"); }}
                placeholder="Your phone number"
                className="w-full rounded-lg border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full rounded-lg bg-accent py-3 font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                {status === "loading" ? "Sending..." : "Get My Discount Code"}
              </button>
              {status === "error" && <p className="text-xs text-red-500">{message}</p>}
            </form>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              We&apos;ll text you a code + seasonal deals. Unsubscribe anytime.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
