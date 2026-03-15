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
  error?: string;
};

export class PosTerminal {
  private readerId: string | null = null;

  constructor(readerId?: string) {
    this.readerId = readerId || null;
  }

  get connectedReaderId() {
    return this.readerId;
  }

  get isSimulated() {
    return this.readerId === "simulated";
  }

  /** List available readers from Stripe */
  async getReaders(): Promise<StripeReader[]> {
    const res = await fetch("/api/pos/terminal/readers");
    if (!res.ok) return [];
    const data = await res.json();
    return data.readers || [];
  }

  /** Connect to a specific reader */
  connectReader(readerId: string) {
    this.readerId = readerId;
  }

  /** Use simulated reader for development/testing */
  useSimulated() {
    this.readerId = "simulated";
  }

  /** Disconnect reader */
  disconnect() {
    this.readerId = null;
  }

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

      // Step 2: Process on reader
      const processRes = await fetch("/api/pos/terminal/process-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readerId: this.readerId, paymentIntentId }),
      });

      if (!processRes.ok) {
        const err = await processRes.json();
        return { success: false, error: err.error || "Payment processing failed" };
      }

      const result = await processRes.json();

      // For simulated reader, payment is already confirmed
      if (this.isSimulated && result.status === "succeeded") {
        return { success: true, paymentIntentId };
      }

      // For real readers, poll for completion
      if (result.status === "processing") {
        return await this.pollPaymentStatus(paymentIntentId);
      }

      return { success: result.status === "succeeded", paymentIntentId };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Payment failed" };
    }
  }

  /** Cancel current payment collection */
  async cancelPayment(): Promise<void> {
    if (!this.readerId) return;
    await fetch("/api/pos/terminal/cancel-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ readerId: this.readerId }),
    });
  }

  /** Poll for payment completion (real readers) */
  private async pollPaymentStatus(paymentIntentId: string, maxAttempts = 60): Promise<PaymentResult> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000)); // Poll every 2s

      const res = await fetch(`/api/pos/terminal/create-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkStatus: true, paymentIntentId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === "succeeded") return { success: true, paymentIntentId };
        if (data.status === "canceled" || data.status === "requires_payment_method") {
          return { success: false, error: "Payment was declined or cancelled" };
        }
        // Still processing — continue polling
      }
    }

    return { success: false, error: "Payment timed out" };
  }
}
