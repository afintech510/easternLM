"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export function NewsletterSignup() {
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contact.trim()) return;

    setStatus("loading");
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact: contact.trim(), source: "footer-newsletter" }),
    });

    if (res.ok) {
      const data = await res.json();
      setStatus("success");
      setMessage(data.channel === "sms" ? "You're in! Watch for deals via text." : "You're in! Check your inbox for deals.");
      setContact("");
    } else {
      const data = await res.json();
      setStatus("error");
      setMessage(data.error || "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div className="text-sm text-green-400">{message}</div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <p className="text-sm font-medium text-primary-foreground/80">
        Get seasonal deals & material tips
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={contact}
          onChange={(e) => { setContact(e.target.value); setStatus("idle"); }}
          placeholder="Phone or email"
          className="flex-1 rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-2 text-sm text-primary-foreground placeholder:text-primary-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {status === "loading" ? "..." : <Send className="h-4 w-4" />}
        </button>
      </div>
      {status === "error" && <p className="text-xs text-red-400">{message}</p>}
      <p className="text-xs text-primary-foreground/40">Unsubscribe anytime. We respect your inbox.</p>
    </form>
  );
}
