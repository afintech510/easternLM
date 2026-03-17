"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, Phone, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";

interface Statement {
  id: string;
  statement_number: string;
  public_token: string;
  balance_due_cents: number;
  charges_cents: number;
  period_start: string;
  period_end: string;
  due_date: string;
  status: string;
  amount_paid_cents: number;
  customers: { charge_account_name: string | null; first_name: string | null; last_name: string | null; payment_terms: string | null } | null;
}

const fmt = (c: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);

export default function StatementPayPage() {
  const { token } = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const paidSuccess = searchParams.get("paid") === "success";

  const [stmt, setStmt] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    fetch(`/api/pay/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.statement) {
          setStmt(d.statement);
          setCustomAmount(((d.statement.balance_due_cents ?? 0) / 100).toFixed(2));
        } else {
          setError("Statement not found.");
        }
      })
      .catch(() => setError("Failed to load statement."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handlePay() {
    if (!stmt) return;
    setRedirecting(true);
    const amountCents = useCustom
      ? Math.round(parseFloat(customAmount || "0") * 100)
      : stmt.balance_due_cents;

    const r = await fetch(`/api/pay/${token}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount_cents: amountCents }),
    });
    const d = await r.json();
    if (d.url) {
      window.location.href = d.url;
    } else {
      alert(d.error ?? "Payment failed");
      setRedirecting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !stmt) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-xl font-semibold">Statement Not Found</h1>
        <p className="text-muted-foreground">{error}</p>
        <a href="tel:6318746244" className="text-blue-600 hover:underline">(631) 874-6244</a>
      </div>
    );
  }

  const isPaid = stmt.status === "paid" || paidSuccess;
  const accountName = stmt.customers?.charge_account_name ?? [stmt.customers?.first_name, stmt.customers?.last_name].filter(Boolean).join(" ") ?? "Account";

  if (isPaid) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <CheckCircle className="size-16 text-green-500" />
        <h1 className="text-2xl font-bold">Payment Received!</h1>
        <p className="text-muted-foreground max-w-sm">
          Thank you, {accountName}. Your payment has been received for statement {stmt.statement_number}.
        </p>
        <a href="tel:6318746244">
          <Button variant="outline"><Phone className="mr-2 size-4" />Call (631) 874-6244</Button>
        </a>
      </div>
    );
  }

  const payAmount = useCustom
    ? Math.round(parseFloat(customAmount || "0") * 100)
    : stmt.balance_due_cents;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-lg">
        <div className="bg-[#1e3a5f] px-8 py-6 text-white">
          <div className="flex items-center justify-between">
            <Image src="/logo-blue.png" alt="Eastern LM" width={120} height={32} className="brightness-0 invert" />
            <div className="text-right text-sm">
              <p>(631) 874-6244</p>
            </div>
          </div>
        </div>

        <div className="bg-white px-8 py-6 space-y-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Statement</p>
            <p className="font-mono font-semibold text-lg">{stmt.statement_number}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Account</p>
              <p className="font-semibold">{accountName}</p>
            </div>
            <div>
              <p className="text-gray-500">Period</p>
              <p>{stmt.period_start} – {stmt.period_end}</p>
            </div>
            <div>
              <p className="text-gray-500">Due Date</p>
              <p className="font-medium">{stmt.due_date}</p>
            </div>
            <div>
              <p className="text-gray-500">Terms</p>
              <p>{stmt.customers?.payment_terms ?? "Net 30"}</p>
            </div>
          </div>

          <div className="rounded-xl bg-gray-50 border p-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">New Charges</span>
              <span>{fmt(stmt.charges_cents)}</span>
            </div>
            {stmt.amount_paid_cents > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Paid to Date</span>
                <span>−{fmt(stmt.amount_paid_cents)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-3 font-bold text-xl">
              <span>Balance Due</span>
              <span>{fmt(stmt.balance_due_cents)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              className="w-full"
              size="lg"
              onClick={() => { setUseCustom(false); handlePay(); }}
              disabled={redirecting}
            >
              {redirecting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Pay Full Balance — {fmt(stmt.balance_due_cents)}
            </Button>

            {!useCustom ? (
              <button
                className="w-full text-sm text-gray-400 underline"
                onClick={() => setUseCustom(true)}
              >
                Pay a different amount
              </button>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 size-4 text-gray-400" />
                  <Input
                    className="pl-8 text-lg"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handlePay}
                  disabled={redirecting || payAmount <= 0}
                >
                  Pay {payAmount > 0 ? fmt(payAmount) : "—"}
                </Button>
                <button className="w-full text-sm text-gray-400 underline" onClick={() => setUseCustom(false)}>
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="border-t pt-4 text-center text-sm text-gray-500 space-y-1">
            <p>Or mail check payable to <strong>Eastern Landscape & Mason Supply</strong></p>
            <p>110 Frowein Road, Center Moriches, NY 11934</p>
            <a href="tel:6318746244" className="text-blue-600 hover:underline">(631) 874-6244</a>
          </div>
        </div>
      </div>
    </div>
  );
}
