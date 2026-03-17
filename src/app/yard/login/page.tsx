"use client";

import { useState, useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function YardLoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Show OAuth errors from redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err === "auth_failed") setError("Sign-in failed. Try again.");
    if (err === "no_code") setError("Sign-in cancelled.");
  }, []);

  async function handleGoogleLogin() {
    setError("");
    setGoogleLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/yard/register`,
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

  function handleKey(key: string) {
    if (key === "backspace") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (pin.length >= 6) return;
    const next = pin + key;
    setPin(next);
    if (next.length >= 4) {
      // Auto-submit once 4+ digits entered and Enter pressed, or via submit button
    }
  }

  async function handlePinSubmit() {
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/yard/login/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Incorrect PIN.");
        setPin("");
        setLoading(false);
        return;
      }
      window.location.href = "/yard/register";
    } catch {
      setError("Network error. Try again.");
      setPin("");
      setLoading(false);
    }
  }

  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["backspace", "0", "enter"],
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-xs space-y-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Eastern LM
          </p>
          <h1 className="mt-1 text-xl font-bold text-white">Yard Register</h1>
        </div>

        {/* Google login */}
        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
        >
          <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          {googleLoading ? "Redirecting…" : "Sign in with Google"}
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-xs text-zinc-600">or staff PIN</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`size-3 rounded-full transition-all ${
                i < pin.length ? "bg-white scale-110" : "bg-zinc-700"
              }`}
            />
          ))}
        </div>

        {/* Numpad */}
        <div className="space-y-2">
          {keys.map((row, ri) => (
            <div key={ri} className="grid grid-cols-3 gap-2">
              {row.map((key) => (
                <button
                  key={key}
                  onClick={() => (key === "enter" ? handlePinSubmit() : handleKey(key))}
                  disabled={loading || googleLoading}
                  className={`rounded-xl py-4 text-center text-lg font-semibold transition active:scale-95 disabled:opacity-40 ${
                    key === "enter"
                      ? "bg-indigo-600 text-white hover:bg-indigo-500"
                      : key === "backspace"
                        ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm"
                        : "bg-zinc-800 text-white hover:bg-zinc-700"
                  }`}
                >
                  {key === "backspace" ? "⌫" : key === "enter" ? "→" : key}
                </button>
              ))}
            </div>
          ))}
        </div>

        {error && (
          <p className="rounded-lg bg-red-900/40 px-3 py-2 text-center text-sm text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
