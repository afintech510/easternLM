/**
 * WebSocket client for the local ELM Print Server.
 *
 * Connects to ws://localhost:9111 (the Node.js print server running on the
 * POS Windows desktop) and sends ESC/POS binary data for thermal printing
 * to a Sunmi NT311 via TCP/Ethernet.
 *
 * Usage:
 *   import { printClient } from "@/lib/pos/print-client";
 *   printClient.connect();
 *   await printClient.print(escPosBytes, "receipt", orderId);
 */

type PrinterStatus = { name: string; ip: string; online: boolean };
type PrintResult = { type: string; success: boolean; error?: string; jobId?: string };
type PendingJob = { resolve: (ok: boolean) => void; reject: (err: Error) => void; timer: ReturnType<typeof setTimeout> };
type ConnectionListener = (connected: boolean) => void;

const WS_URL = "ws://localhost:9111";
const RECONNECT_MS = 5000;
const PRINT_TIMEOUT_MS = 15000;

class PrintClient {
  private static instance: PrintClient;
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingJobs = new Map<string, PendingJob>();
  private listeners = new Set<ConnectionListener>();
  private _printerStatuses: Record<string, PrinterStatus> = {};

  static getInstance(): PrintClient {
    if (!PrintClient.instance) {
      PrintClient.instance = new PrintClient();
    }
    return PrintClient.instance;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /** Per-printer online/offline statuses from the print server. */
  get printerStatuses(): Record<string, PrinterStatus> {
    return this._printerStatuses;
  }

  /** True if at least one printer is online. */
  get isAnyPrinterOnline(): boolean {
    return Object.values(this._printerStatuses).some((p) => p.online);
  }

  /** Subscribe to connection state changes. Returns unsubscribe fn. */
  onConnectionChange(fn: ConnectionListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notifyListeners() {
    const connected = this.isConnected;
    for (const fn of this.listeners) {
      try { fn(connected); } catch {}
    }
  }

  /** Connect to the local print server. Safe to call multiple times. */
  connect(): void {
    if (typeof window === "undefined") return; // SSR guard
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log("[PrintClient] Connected to print server");
        this.notifyListeners();
        this.ws?.send(JSON.stringify({ type: "ping" }));
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "pong") {
            // Multi-printer statuses from Sunmi TCP server
            this._printerStatuses = msg.printers ?? {};
            const summary = Object.entries(this._printerStatuses)
              .map(([, v]) => `${(v as PrinterStatus).name}: ${(v as PrinterStatus).online ? "online" : "offline"}`)
              .join(", ");
            console.log(`[PrintClient] Printers: ${summary}`);
            this.notifyListeners();
            return;
          }

          // Resolve pending print jobs
          if (msg.type === "print_result" && msg.jobId) {
            const job = this.pendingJobs.get(msg.jobId);
            if (job) {
              clearTimeout(job.timer);
              this.pendingJobs.delete(msg.jobId);
              if (msg.success) {
                job.resolve(true);
              } else {
                job.reject(new Error(msg.error || "Print failed"));
              }
            }
          }

          if (msg.type === "test_result") {
            console.log(`[PrintClient] Test print: ${msg.success ? "OK" : msg.error}`);
          }

          if (msg.type === "cash_drawer_result") {
            console.log(`[PrintClient] Cash drawer: ${msg.success ? "OK" : msg.error}`);
          }
        } catch {}
      };

      this.ws.onclose = () => {
        console.log("[PrintClient] Disconnected — reconnecting in 5s");
        this._printerStatuses = {};
        this.notifyListeners();
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        // onclose fires after onerror
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, RECONNECT_MS);
  }

  /**
   * Send ESC/POS binary data to the print server.
   * @param printer - target printer key (default: "counter")
   */
  async print(
    escPosData: Uint8Array | number[],
    docType: string,
    orderId?: string,
    printer: string = "counter",
  ): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error("Print server not connected");
    }

    const bytes = escPosData instanceof Uint8Array ? escPosData : new Uint8Array(escPosData);
    const jobId = crypto.randomUUID();

    return new Promise<boolean>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pendingJobs.has(jobId)) {
          this.pendingJobs.delete(jobId);
          reject(new Error("Print timeout — check printer"));
        }
      }, PRINT_TIMEOUT_MS);

      this.pendingJobs.set(jobId, { resolve, reject, timer });

      this.ws!.send(
        JSON.stringify({
          type: "print",
          data: uint8ArrayToBase64(bytes),
          docType,
          orderId,
          jobId,
          printer,
        })
      );
    });
  }

  /** Send a test print to verify the printer is working. */
  testPrint(printer: string = "counter"): void {
    if (!this.isConnected) throw new Error("Print server not connected");
    this.ws!.send(JSON.stringify({ type: "test", printer }));
  }

  /** Open the cash drawer via the print server. */
  openCashDrawer(printer: string = "counter"): void {
    if (!this.isConnected) return;
    this.ws!.send(JSON.stringify({ type: "cash_drawer", printer }));
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null; // prevent reconnect
      this.ws.close();
      this.ws = null;
    }
    this._printerStatuses = {};
    this.notifyListeners();
  }
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const printClient = PrintClient.getInstance();
