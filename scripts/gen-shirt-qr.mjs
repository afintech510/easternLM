// Generates the crew-shirt QR (same dot + center "e" style as qr-code-banner.html).
// Usage: node scripts/gen-shirt-qr.mjs [variant] [--invert]
//   → tmp/qr/eastern-lm-qr-shirt[-variant][-white].{svg,png}
// --invert: white dots + white "e" on a transparent background, for dark shirts.
// The code points at /shirt, which logs the scan to qr_scans and redirects home with UTMs.
import fs from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";

const args = process.argv.slice(2);
const invert = args.includes("--invert");
const variant = args.find((a) => !a.startsWith("--"));
const URL = `https://easternlm.com/shirt${variant ? `?s=${variant}` : ""}`;
const SIZE = 2400;
const INK = invert ? "#ffffff" : "#1a1a1a";

const qr = QRCode.create(URL, { errorCorrectionLevel: "H" });
const n = qr.modules.size;
// Full 4-module quiet zone baked in — shirt printers tend to crop tight
const cell = SIZE / (n + 8);
const QUIET = cell * 4;
const dot = cell * 0.42;
const c = SIZE / 2;
const logoClear = SIZE * 0.14;
const logoSize = SIZE * 0.22;
const logoPad = 24;

const finder = (r, col) => (r < 7 && col < 7) || (r < 7 && col >= n - 7) || (r >= n - 7 && col < 7);

let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">`;
if (!invert) svg += `<rect width="${SIZE}" height="${SIZE}" fill="#fff"/>`;
for (let r = 0; r < n; r++) {
  for (let col = 0; col < n; col++) {
    if (!qr.modules.get(r, col)) continue;
    const px = QUIET + col * cell, py = QUIET + r * cell;
    const cx = px + cell / 2, cy = py + cell / 2;
    if (Math.hypot(cx - c, cy - c) < logoClear) continue;
    svg += finder(r, col)
      ? `<rect x="${px}" y="${py}" width="${cell + 0.5}" height="${cell + 0.5}" fill="${INK}"/>`
      : `<circle cx="${cx}" cy="${cy}" r="${dot}" fill="${INK}"/>`;
  }
}
const logo = (invert ? await whiteLogo() : fs.readFileSync("public/android-chrome-512x512.png")).toString("base64");
if (!invert) svg += `<circle cx="${c}" cy="${c}" r="${logoSize / 2 + logoPad}" fill="#fff"/>`;
svg += `<clipPath id="l"><circle cx="${c}" cy="${c}" r="${logoSize / 2}"/></clipPath>`;
svg += `<image x="${c - logoSize / 2}" y="${c - logoSize / 2}" width="${logoSize}" height="${logoSize}" clip-path="url(#l)" href="data:image/png;base64,${logo}"/>`;
svg += `</svg>`;

const outDir = "tmp/qr";
fs.mkdirSync(outDir, { recursive: true });
const base = path.join(outDir, `eastern-lm-qr-shirt${variant ? `-${variant}` : ""}${invert ? "-white" : ""}`);
fs.writeFileSync(`${base}.svg`, svg);
await sharp(Buffer.from(svg)).png().toFile(`${base}.png`);
console.log(`${URL}\n${n}x${n} modules (version ${qr.version}, EC H)\n${base}.svg\n${base}.png`);

// Logo is a navy "e" on a white disc. Keep only the "e", recolored white:
// alpha follows how dark the pixel is, so anti-aliased edges stay smooth.
async function whiteLogo() {
  const { data, info } = await sharp("public/android-chrome-512x512.png")
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const darkness = 1 - (data[i] + data[i + 1] + data[i + 2]) / 3 / 255;
    data[i + 3] = Math.round(Math.min(1, darkness / 0.6) * data[i + 3]);
    data[i] = data[i + 1] = data[i + 2] = 255;
  }
  return sharp(data, { raw: info }).png().toBuffer();
}
