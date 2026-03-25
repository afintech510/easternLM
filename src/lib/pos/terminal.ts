/**
 * POS Terminal — manages Stripe Terminal reader connections and payments.
 * Server-driven integration (no Stripe JS Terminal SDK needed).
 */

export type StripeReader = {
  id: string;
  label: string | null;
  status: string;
  device_type: string;
  serial_number: string | null;
  ip_address: string | null;
};

export type PaymentResult = {
  success: boolean;
  paymentIntentId?: string;
  cardBrand?: string;
  cardLast4?: string;
  error?: string;
};

export class PosTerminal {
  private readerId: string | null = null;
  private _polling = false;

  constructor(readerId?: string) {
    this.readerId = readerId || null;
  }

  get connectedReaderId() { return this.readerId; }
  get isSimulated() { return this.readerId === "simulated"; }
  get isPolling() { return this._polling; }

  async getReaders(): Promise<StripeReader[]> {
    const res = await fetch("/api/pos/terminal/readers");
    if (!res.ok) return [];
    const data = await res.json();
    return data.readers || [];
  }

  connectReader(readerId: string) { this.readerId = readerId; }
  useSimulated() { this.readerId = "simulated"; }
  disconnect() { this.readerId = null; }

  /** Collect a card payment */
  async collectPayment(input: {
    amountCents: number;
    orderId: string;
    metadata?: Record<string, string>;
  }): Promise<PaymentResult> {
    if (!this.readerId) {
      return { success: false, error: "No reader connected" };
    }

    try {
      // Step 1: Create PaymentIntent
      const createRes = await fetch("/api/pos/terminal/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        return { success: false, error: err.error || "Failed to create payment" };
      }

      const { paymentIntentId } = await createRes.json();

      // Step 2: Send to reader
      const processRes = await fetch("/api/pos/terminal/process-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readerId: this.readerId, paymentIntentId }),
      });

      if (!processRes.ok) {
        const err = await processRes.json();
        return { success: false, error: err.error || "Failed to send to reader" };
      }

      const result = await processRes.json();

      // Simulated reader completes immediately
      if (this.isSimulated && result.status === "succeeded") {
        return { success: true, paymentIntentId };
      }

      // Real reader: poll for completion (up to 2 minutes)
      return await this.pollPaymentStatus(paymentIntentId);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Payment failed" };
    }
  }

  /** Cancel current reader action + PaymentIntent */
  async cancelPayment(paymentIntentId?: string): Promise<void> {
    // Cancel reader action (stops "Tap or Insert" display)
    if (this.readerId && this.readerId !== "simulated") {
      try {
        await fetch("/api/pos/terminal/cancel-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ readerId: this.readerId }),
        });
      } catch { /* reader cancel may fail — that's OK */ }
    }

    // Cancel the PaymentIntent
    if (paymentIntentId) {
      try {
        await fetch("/api/pos/terminal/cancel-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId }),
        });
      } catch { /* PI cancel may fail if already succeeded */ }
    }

    this._polling = false;
  }

  /** Poll for payment completion — waits up to 2 minutes */
  private async pollPaymentStatus(paymentIntentId: string): Promise<PaymentResult> {
    this._polling = true;
    const POLL_INTERVAL = 1500; // 1.5 seconds
    const MAX_WAIT = 120_000;   // 2 minutes
    const startTime = Date.now();

    while (this._polling && Date.now() - startTime < MAX_WAIT) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      if (!this._polling) break; // cancelled

      try {
        const res = await fetch("/api/pos/terminal/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkStatus: true, paymentIntentId }),
        });

        if (!res.ok) continue;

        const data = await res.json();

        if (data.status === "succeeded" || data.status === "requires_capture") {
          this._polling = false;
          return {
            success: true,
            paymentIntentId,
            cardBrand: data.cardBrand ?? undefined,
            cardLast4: data.last4 ?? undefined,
          };
        }

        if (data.status === "canceled") {
          this._polling = false;
          return { success: false, paymentIntentId, error: "Payment was cancelled" };
        }

        // "requires_payment_method" = reader is still waiting for card tap
        // "requires_confirmation" = card read, confirming
        // "requires_action" = additional verification
        // "processing" = payment is being processed
        // ALL of these mean: keep polling
      } catch {
        // Network error — retry
      }
    }

    this._polling = false;
    return { success: false, paymentIntentId, error: "Payment timed out — customer did not tap card" };
  }
}
