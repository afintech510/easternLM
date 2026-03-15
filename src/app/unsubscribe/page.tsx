"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const customerId = searchParams.get("id") || searchParams.get("token");
  const [choice, setChoice] = useState<"email" | "sms" | "all" | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  async function handleUnsubscribe() {
    if (!choice || !customerId) return;
    setStatus("loading");

    await fetch("/api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, channel: choice }),
    });

    setStatus("done");
  }

  if (!customerId) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Invalid Link</h1>
        <p className="mt-2 text-muted-foreground">This unsubscribe link is not valid.</p>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
        <h1 className="mt-4 text-2xl font-bold">Unsubscribed</h1>
        <p className="mt-2 text-muted-foreground">
          {choice === "email" && "You won't receive any more marketing emails from us."}
          {choice === "sms" && "You won't receive any more text messages from us."}
          {choice === "all" && "You won't receive any more marketing messages from us."}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Eastern Landscape & Mason Supply<br />
          110 Frowein Road, Center Moriches, NY 11934<br />
          (631) 874-6244
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <h1 className="text-2xl font-bold">Unsubscribe</h1>
      <p className="mt-2 text-muted-foreground">
        Choose what you&apos;d like to unsubscribe from:
      </p>

      <div className="mt-6 space-y-3">
        {(["email", "sms", "all"] as const).map((ch) => (
          <label key={ch} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${choice === ch ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
            <input type="radio" name="channel" checked={choice === ch} onChange={() => setChoice(ch)} className="h-4 w-4" />
            <div>
              <p className="text-sm font-medium">
                {ch === "email" && "Unsubscribe from emails only"}
                {ch === "sms" && "Unsubscribe from texts only"}
                {ch === "all" && "Unsubscribe from everything"}
              </p>
              <p className="text-xs text-muted-foreground">
                {ch === "email" && "You'll still receive text messages"}
                {ch === "sms" && "You'll still receive emails"}
                {ch === "all" && "No more marketing messages of any kind"}
              </p>
            </div>
          </label>
        ))}
      </div>

      <Button onClick={handleUnsubscribe} disabled={!choice || status === "loading"} className="mt-6 w-full">
        {status === "loading" ? "Processing..." : "Confirm Unsubscribe"}
      </Button>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        This will not affect order confirmations or delivery notifications.
      </p>
    </div>
  );
}
