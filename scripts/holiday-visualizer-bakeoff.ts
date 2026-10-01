/**
 * Day-1 model bake-off for the Holiday Lights AI Visualizer.
 *
 * Runs a grid of (photo × style × model) against Replicate directly (no mock
 * mode, no Next.js server) and writes a side-by-side HTML comparison so we can
 * pick a default model/prompt before wiring it into
 * src/lib/holiday-lights/visualize.ts.
 *
 * Usage:
 *   npx tsx scripts/holiday-visualizer-bakeoff.ts [inputDir=tmp/bakeoff/input] \
 *     [--models=google/nano-banana-pro,black-forest-labs/flux-kontext-pro] \
 *     [--styles=warm,multi,candy,elegant]
 *
 * `tsx` isn't a project dependency (by design — we don't add deps for a one-off
 * script). `npx tsx ...` downloads it on the fly the first time you run this.
 *
 * Reads REPLICATE_API_KEY from the environment, falling back to ../.env.local
 * (parsed as simple KEY=VALUE lines, same as the other scripts in this folder).
 *
 * Drop a handful of real daytime house photos (jpg/jpeg/png/webp/heic) into
 * inputDir before running. Output goes to tmp/bakeoff/<model>/<photo>-<style>.jpg
 * plus a tmp/bakeoff/index.html comparison grid.
 */

import { readFileSync } from "fs";
import { mkdir, readdir, writeFile } from "fs/promises";
import { basename, extname, join, relative, resolve, sep } from "path";
import sharp from "sharp";
import {
  buildModelInput,
  buildPrompt,
  isVisualizerStyle,
  STYLE_KEYS,
  type VisualizerStyle,
} from "../src/lib/holiday-lights/visualize";

const DEFAULT_MODELS = ["google/nano-banana-pro", "black-forest-labs/flux-kontext-pro"];
const MAX_EDGE = 1024;
const CONCURRENCY = 3;
const POLL_MS = 2000;
const POLL_TIMEOUT_MS = 3 * 60 * 1000;
const IMAGE_EXT_RE = /\.(jpe?g|png|webp|heic|heif)$/i;

// ─── env / CLI ────────────────────────────────────────────────────────

/** Minimal KEY=VALUE .env parser (mirrors scripts/apply-restructure.ts etc.) — no dotenv dependency. */
function loadEnvLocal(): void {
  if (process.env.REPLICATE_API_KEY) return;
  let content: string;
  try {
    content = readFileSync(resolve(__dirname, "..", ".env.local"), "utf-8");
  } catch {
    return;
  }
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  const flags = new Map<string, string>();
  for (const arg of argv) {
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq === -1) flags.set(arg.slice(2), "true");
      else flags.set(arg.slice(2, eq), arg.slice(eq + 1));
    } else {
      positional.push(arg);
    }
  }

  const inputDir = resolve(process.cwd(), positional[0] ?? "tmp/bakeoff/input");

  const models = (flags.get("models") ?? DEFAULT_MODELS.join(","))
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

  const requestedStyles = (flags.get("styles") ?? STYLE_KEYS.join(","))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const styles: VisualizerStyle[] = [];
  for (const s of requestedStyles) {
    if (isVisualizerStyle(s)) styles.push(s);
    else console.warn(`[bakeoff] ignoring unknown style "${s}" (valid: ${STYLE_KEYS.join(", ")})`);
  }

  return { inputDir, models, styles: styles.length > 0 ? styles : [...STYLE_KEYS] };
}

// ─── image prep ───────────────────────────────────────────────────────

async function listImages(dir: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  return entries.filter((f) => IMAGE_EXT_RE.test(f)).map((f) => join(dir, f)).sort();
}

/** Auto-rotate + downscale to a max 1024px edge, JPEG q80, returned as a data URI. */
async function toDataUri(filePath: string): Promise<string> {
  const buf = await sharp(filePath)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

// ─── Replicate ────────────────────────────────────────────────────────

type ReplicatePrediction = { id: string; status: string; output?: unknown; error?: unknown };

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

type RunResult = {
  photo: string;
  style: VisualizerStyle;
  model: string;
  status: "succeeded" | "failed" | "timeout" | "error";
  seconds: number;
  outputPath: string | null;
  error: string | null;
};

async function runOne(
  apiKey: string,
  outRoot: string,
  photo: string,
  dataUri: string,
  style: VisualizerStyle,
  model: string,
): Promise<RunResult> {
  const startedAt = Date.now();
  const slug = model.split(":")[0];
  const label = `[${model}] ${basename(photo)} × ${style}`;
  console.log(`${label}: starting…`);

  try {
    const input = buildModelInput(model, buildPrompt(style), dataUri);
    const createRes = await fetch(`https://api.replicate.com/v1/models/${slug}/predictions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });
    if (!createRes.ok) {
      const text = await createRes.text().catch(() => "");
      throw new Error(`create ${createRes.status}: ${text.slice(0, 300)}`);
    }
    let prediction = (await createRes.json()) as ReplicatePrediction;

    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (prediction.status !== "succeeded" && prediction.status !== "failed" && prediction.status !== "canceled") {
      if (Date.now() > deadline) {
        return {
          photo,
          style,
          model,
          status: "timeout",
          seconds: (Date.now() - startedAt) / 1000,
          outputPath: null,
          error: `Timed out after ${POLL_TIMEOUT_MS / 1000}s (last status: ${prediction.status})`,
        };
      }
      await sleep(POLL_MS);
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${encodeURIComponent(prediction.id)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!pollRes.ok) throw new Error(`poll ${pollRes.status}`);
      prediction = (await pollRes.json()) as ReplicatePrediction;
    }

    const seconds = (Date.now() - startedAt) / 1000;
    if (prediction.status !== "succeeded") {
      const error = prediction.error ? String(prediction.error) : `status=${prediction.status}`;
      console.log(`${label}: ✗ ${prediction.status} (${seconds.toFixed(1)}s) — ${error}`);
      return { photo, style, model, status: "failed", seconds, outputPath: null, error };
    }

    const outUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    if (typeof outUrl !== "string") throw new Error("No output URL in prediction result");

    const imgRes = await fetch(outUrl);
    if (!imgRes.ok) throw new Error(`download ${imgRes.status}`);
    const buf = Buffer.from(await imgRes.arrayBuffer());

    const modelDir = join(outRoot, slug.replace(/\//g, "-"));
    await mkdir(modelDir, { recursive: true });
    const outputPath = join(modelDir, `${basename(photo, extname(photo))}-${style}.jpg`);
    await writeFile(outputPath, buf);

    console.log(`${label}: ✓ succeeded (${seconds.toFixed(1)}s) → ${outputPath}`);
    return { photo, style, model, status: "succeeded", seconds, outputPath, error: null };
  } catch (err) {
    const seconds = (Date.now() - startedAt) / 1000;
    const message = err instanceof Error ? err.message : String(err);
    console.log(`${label}: ✗ error (${seconds.toFixed(1)}s) — ${message}`);
    return { photo, style, model, status: "error", seconds, outputPath: null, error: message };
  }
}

/** Runs `tasks` with at most `limit` in flight at once. */
async function runWithConcurrency<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= tasks.length) return;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

// ─── HTML report ──────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function relPath(from: string, to: string): string {
  return relative(from, to).split(sep).join("/");
}

function writeReport(outRoot: string, models: string[], results: RunResult[]): string {
  const byRow = new Map<string, Map<string, RunResult>>();
  for (const r of results) {
    const rowKey = `${r.photo}::${r.style}`;
    if (!byRow.has(rowKey)) byRow.set(rowKey, new Map());
    byRow.get(rowKey)!.set(r.model, r);
  }

  const rows = [...byRow.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([rowKey, byModel]) => {
      const [photo, style] = rowKey.split("::");
      const originalRel = relPath(outRoot, photo);
      const cells = models
        .map((m) => {
          const r = byModel.get(m);
          if (!r) return `<td class="cell missing">—</td>`;
          if (r.status !== "succeeded" || !r.outputPath) {
            return `<td class="cell fail"><p class="err">${escapeHtml(r.status)}</p><p class="err-msg">${escapeHtml(r.error ?? "")}</p><p class="secs">${r.seconds.toFixed(1)}s</p></td>`;
          }
          return `<td class="cell ok"><img src="${relPath(outRoot, r.outputPath)}" alt="${escapeHtml(m)} — ${escapeHtml(style)}"/><p class="secs">${r.seconds.toFixed(1)}s</p></td>`;
        })
        .join("\n");
      return `<tr>
        <td class="meta"><b>${escapeHtml(basename(photo))}</b><br/><span class="style">${escapeHtml(style)}</span></td>
        <td class="cell original"><img src="${originalRel}" alt="original"/></td>
        ${cells}
      </tr>`;
    })
    .join("\n");

  const summaryRows = models
    .map((m) => {
      const rs = results.filter((r) => r.model === m);
      const ok = rs.filter((r) => r.status === "succeeded");
      const fail = rs.length - ok.length;
      const avg = ok.length > 0 ? ok.reduce((sum, r) => sum + r.seconds, 0) / ok.length : null;
      return `<tr><td>${escapeHtml(m)}</td><td>${ok.length}</td><td>${fail}</td><td>${avg !== null ? avg.toFixed(1) + "s" : "—"}</td></tr>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Holiday Lights Visualizer — model bake-off</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 24px; background: #11161d; color: #e7ecf2; }
  h1 { margin-bottom: 4px; }
  .sub { color: #9fb0c3; margin-top: 0; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 32px; }
  td, th { border: 1px solid #2a3340; padding: 8px; vertical-align: top; }
  th { text-align: left; background: #1a2230; }
  .meta { white-space: nowrap; }
  .style { color: #9fb0c3; font-size: 12px; text-transform: capitalize; }
  .cell img { max-width: 260px; display: block; border-radius: 6px; }
  .cell.fail { color: #ff8a8a; max-width: 260px; }
  .cell.missing { color: #556; text-align: center; }
  .secs { color: #9fb0c3; font-size: 12px; margin: 4px 0 0; }
  .err { font-weight: 600; margin: 0; }
  .err-msg { font-size: 12px; margin: 4px 0 0; word-break: break-word; }
</style>
</head>
<body>
  <h1>Holiday Lights Visualizer — model bake-off</h1>
  <p class="sub">Generated ${new Date().toISOString()}</p>

  <h2>Summary</h2>
  <table>
    <tr><th>Model</th><th>Succeeded</th><th>Failed</th><th>Avg seconds (successes)</th></tr>
    ${summaryRows}
  </table>

  <h2>Results</h2>
  <table>
    <tr><th>Photo / style</th><th>Original</th>${models.map((m) => `<th>${escapeHtml(m)}</th>`).join("")}</tr>
    ${rows}
  </table>
</body>
</html>`;
}

// ─── main ─────────────────────────────────────────────────────────────

async function main() {
  loadEnvLocal();
  const apiKey = process.env.REPLICATE_API_KEY;
  if (!apiKey) {
    console.error("Missing REPLICATE_API_KEY (set it in the environment or in .env.local).");
    process.exit(1);
  }

  const { inputDir, models, styles } = parseArgs(process.argv.slice(2));
  const outRoot = resolve(process.cwd(), "tmp/bakeoff");
  await mkdir(outRoot, { recursive: true });

  const photos = await listImages(inputDir);
  if (photos.length === 0) {
    console.error(`No images found in ${inputDir} (expected .jpg/.jpeg/.png/.webp/.heic). Add some and re-run.`);
    process.exit(1);
  }

  console.log(`[bakeoff] ${photos.length} photo(s) × ${models.length} model(s) × ${styles.length} style(s)`);
  console.log(`[bakeoff] models: ${models.join(", ")}`);
  console.log(`[bakeoff] styles: ${styles.join(", ")}`);
  console.log(`[bakeoff] input: ${inputDir}`);
  console.log(`[bakeoff] output: ${outRoot}\n`);

  const dataUris = new Map<string, string>();
  for (const photo of photos) {
    try {
      dataUris.set(photo, await toDataUri(photo));
    } catch (err) {
      console.warn(`[bakeoff] skipping ${basename(photo)}: couldn't read/convert it (${err instanceof Error ? err.message : err})`);
    }
  }

  const usablePhotos = photos.filter((p) => dataUris.has(p));
  const tasks: Array<() => Promise<RunResult>> = [];
  for (const photo of usablePhotos) {
    const dataUri = dataUris.get(photo)!;
    for (const style of styles) {
      for (const model of models) {
        tasks.push(() => runOne(apiKey, outRoot, photo, dataUri, style, model));
      }
    }
  }

  const results = await runWithConcurrency(tasks, CONCURRENCY);

  const html = writeReport(outRoot, models, results);
  const indexPath = join(outRoot, "index.html");
  await writeFile(indexPath, html, "utf-8");

  const succeeded = results.filter((r) => r.status === "succeeded").length;
  console.log(`\n[bakeoff] done: ${succeeded}/${results.length} succeeded.`);
  console.log(`[bakeoff] report: ${indexPath}`);
}

main().catch((err) => {
  console.error("[bakeoff] fatal:", err);
  process.exit(1);
});
