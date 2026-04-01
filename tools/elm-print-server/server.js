/**
 * ELM Print Server — Sunmi NT311 via TCP/Ethernet
 *
 * Receives print jobs via WebSocket from the POS browser (localhost:9111),
 * sends raw ESC/POS bytes to the Sunmi NT311 over TCP port 9100.
 * No drivers. No Windows printer config. Just raw bytes over the network.
 */

const { WebSocketServer } = require("ws");
const net = require("net");

// ── Configuration ─────────────────────────────────────────────
const VERSION = "1.2.0";
const WS_PORT = parseInt(process.env.WS_PORT || "9111", 10);

const PRINTERS = {
  counter: {
    name: "Counter (NT311)",
    ip: process.env.PRINTER_COUNTER_IP || "192.168.1.4",
    port: parseInt(process.env.PRINTER_COUNTER_PORT || "9100", 10),
  },
};

// ── TCP Print ─────────────────────────────────────────────────

function printToPrinter(pc, escPosBytes) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.setTimeout(10000);

    client.connect(pc.port, pc.ip, () => {
      client.write(escPosBytes, () => {
        client.end();
        resolve(true);
      });
    });

    client.on("error", (err) => {
      reject(new Error(`${pc.name} (${pc.ip}): ${err.message}`));
    });

    client.on("timeout", () => {
      client.destroy();
      reject(new Error(`${pc.name} timed out`));
    });
  });
}

// ── Health Check ──────────────────────────────────────────────

function checkPrinter(pc) {
  return new Promise((resolve) => {
    const client = new net.Socket();
    client.setTimeout(3000);
    client.connect(pc.port, pc.ip, () => {
      client.end();
      resolve({ name: pc.name, ip: pc.ip, online: true });
    });
    client.on("error", () =>
      resolve({ name: pc.name, ip: pc.ip, online: false })
    );
    client.on("timeout", () => {
      client.destroy();
      resolve({ name: pc.name, ip: pc.ip, online: false });
    });
  });
}

// ── Test Receipt ──────────────────────────────────────────────

function buildTestReceipt() {
  const ESC = 0x1b;
  const GS = 0x1d;
  const buf = [];

  buf.push(ESC, 0x40); // init
  buf.push(ESC, 0x63, 0x35, 0x00);                         // ESC c 5 0 — panel buzzer off
  buf.push(GS, 0x28, 0x45, 0x03, 0x00, 0x61, 0x61, 0x00);  // GS ( E — buzzer off
  buf.push(0x1C, 0x28, 0x45, 0x03, 0x00, 0x61, 0x61, 0x00); // FS ( E — Sunmi variant
  buf.push(ESC, 0x61, 0x01); // center

  buf.push(GS, 0x21, 0x01); // double height
  buf.push(ESC, 0x45, 0x01); // bold
  addText(buf, "EASTERN LANDSCAPE");
  buf.push(0x0a);
  addText(buf, "& MASON SUPPLY");
  buf.push(0x0a);
  buf.push(GS, 0x21, 0x00);
  buf.push(ESC, 0x45, 0x00);

  addText(buf, "================================");
  buf.push(0x0a);
  addText(buf, "SUNMI NT311 - TEST PRINT");
  buf.push(0x0a);
  addText(buf, "================================");
  buf.push(0x0a, 0x0a);

  buf.push(ESC, 0x61, 0x00); // left
  addText(buf, "Date: " + new Date().toLocaleString());
  buf.push(0x0a);
  addText(buf, "Server: ws://localhost:" + WS_PORT);
  buf.push(0x0a);

  for (const [key, p] of Object.entries(PRINTERS)) {
    addText(buf, key + ": " + p.ip + ":" + p.port);
    buf.push(0x0a);
  }

  buf.push(0x0a);
  buf.push(ESC, 0x61, 0x01); // center
  addText(buf, "TCP print is working!");
  buf.push(0x0a);
  addText(buf, "================================");
  buf.push(0x0a, 0x0a, 0x0a);
  buf.push(GS, 0x56, 0x00); // full cut

  return Buffer.from(buf);
}

function addText(buf, text) {
  for (let i = 0; i < text.length; i++) buf.push(text.charCodeAt(i));
}

// ── WebSocket Server ──────────────────────────────────────────

const wss = new WebSocketServer({ port: WS_PORT });

console.log("");
console.log("========================================");
console.log("  ELM PRINT SERVER v" + VERSION);
console.log("  Sunmi NT311 via TCP");
console.log("========================================");
console.log("  WebSocket: ws://localhost:" + WS_PORT);
for (const [, p] of Object.entries(PRINTERS)) {
  console.log("  " + p.name + ": " + p.ip + ":" + p.port);
}
console.log("========================================");
console.log("");

// Check printers on startup
(async () => {
  for (const [, p] of Object.entries(PRINTERS)) {
    const s = await checkPrinter(p);
    console.log(
      "  " + s.name + ": " + (s.online ? "ONLINE" : "OFFLINE")
    );
  }
  console.log("");
})();

wss.on("connection", (ws) => {
  console.log("[WS] Client connected");

  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === "ping") {
        const printers = {};
        for (const [k, p] of Object.entries(PRINTERS)) {
          printers[k] = await checkPrinter(p);
        }
        ws.send(JSON.stringify({ type: "pong", printers }));
        return;
      }

      if (msg.type === "print") {
        const rawBytes = Buffer.from(msg.data, "base64");
        const target = msg.printer || "counter";
        const pc = PRINTERS[target];

        if (!pc) {
          ws.send(
            JSON.stringify({
              type: "print_result",
              success: false,
              error: "Unknown printer: " + target,
              jobId: msg.jobId,
            })
          );
          return;
        }

        console.log(
          "[Print] " +
            (msg.docType || "?") +
            " -> " +
            pc.name +
            " (" +
            rawBytes.length +
            " bytes)"
        );

        try {
          await printToPrinter(pc, rawBytes);
          ws.send(
            JSON.stringify({
              type: "print_result",
              success: true,
              printer: pc.name,
              jobId: msg.jobId,
            })
          );
        } catch (err) {
          console.error("[Print] FAILED:", err.message);
          ws.send(
            JSON.stringify({
              type: "print_result",
              success: false,
              error: err.message,
              printer: pc.name,
              jobId: msg.jobId,
            })
          );
        }
        return;
      }

      if (msg.type === "test") {
        const target = msg.printer || "counter";
        const pc = PRINTERS[target];
        if (!pc) {
          ws.send(
            JSON.stringify({
              type: "test_result",
              success: false,
              error: "Unknown printer",
            })
          );
          return;
        }

        try {
          await printToPrinter(pc, buildTestReceipt());
          ws.send(
            JSON.stringify({
              type: "test_result",
              success: true,
              printer: pc.name,
            })
          );
          console.log("[Test] OK -> " + pc.name);
        } catch (err) {
          ws.send(
            JSON.stringify({
              type: "test_result",
              success: false,
              error: err.message,
            })
          );
          console.error("[Test] FAILED:", err.message);
        }
        return;
      }

      if (msg.type === "status") {
        const printers = {};
        for (const [k, p] of Object.entries(PRINTERS)) {
          printers[k] = await checkPrinter(p);
        }
        ws.send(JSON.stringify({ type: "status_result", printers }));
        return;
      }

      if (msg.type === "cash_drawer") {
        const target = msg.printer || "counter";
        const pc = PRINTERS[target];
        if (!pc) return;
        try {
          await printToPrinter(
            pc,
            Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa])
          );
          ws.send(
            JSON.stringify({ type: "cash_drawer_result", success: true })
          );
        } catch (err) {
          ws.send(
            JSON.stringify({
              type: "cash_drawer_result",
              success: false,
              error: err.message,
            })
          );
        }
        return;
      }
    } catch (err) {
      console.error("[WS] Error:", err.message);
    }
  });

  ws.on("close", () => console.log("[WS] Client disconnected"));
});

// Health check every 60s
setInterval(async () => {
  for (const [, p] of Object.entries(PRINTERS)) {
    const s = await checkPrinter(p);
    if (!s.online) console.warn("[Health] " + p.name + " OFFLINE");
  }
}, 60000);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[ELM Print Server] Shutting down...");
  wss.close(() => process.exit(0));
});
