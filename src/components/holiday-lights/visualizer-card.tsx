"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { SMS_CONSENT_TEXT } from "@/config/holiday-lights";
import { trackEvent, trackGenerateLead, trackMetaEvent } from "@/lib/bulk-analytics";
import { CompareSlider } from "./compare-slider";
import { CtaButton } from "./cta-button";
import { getUtm, toast } from "./events";
import { PhoneInput, phoneDigits } from "./phone-input";

type Style = "warm" | "multi" | "candy" | "elegant";
type Step = "v1" | "v2" | "v3" | "v4";

type VizStatus = {
  status: "uploaded" | "generating" | "ready" | "failed";
  unlocked: boolean;
  imageUrl: string | null;
  width: number | null;
  height: number | null;
  canRestyle: boolean;
  shareUrl: string;
};

const STYLES: { value: Style; label: string; color: string }[] = [
  { value: "warm", label: "Classic Warm White", color: "#ffdf9c" },
  { value: "multi", label: "Multicolor", color: "#4a95ff" },
  { value: "candy", label: "Candy Cane", color: "#ff3d3d" },
  { value: "elegant", label: "Elegant White + Wreaths", color: "#fff3d6" },
];

const POLL_MS = 2000;
const TEASER_POLL_MS = 2500;
const SLOW_MS = 45_000;
const MAX_EDGE = 2000;

/** Downscale big phone photos in the browser (≈2000px JPEG) so uploads are quick on cellular. */
async function downscale(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  try {
    let source: ImageBitmap | HTMLImageElement;
    try {
      source = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      source = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      });
    }
    const w0 = "naturalWidth" in source ? source.naturalWidth : source.width;
    const h0 = "naturalHeight" in source ? source.naturalHeight : source.height;
    const scale = Math.min(1, MAX_EDGE / Math.max(w0, h0));
    const width = Math.round(w0 * scale);
    const height = Math.round(h0 * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(source, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob) throw new Error("toBlob failed");
    return { blob, width, height };
  } catch {
    return { blob: file, width: 0, height: 0 };
  }
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
  return data as T;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/**
 * AI Visualizer card: the artifact's four states (#v1–#v4) wired to the real API.
 * Upload + generation start in the background on "Next", so the image is usually
 * ready by the time the customer has typed their name and number.
 */
export function VisualizerCard() {
  const [step, setStep] = useState<Step>("v1");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [style, setStyle] = useState<Style>("warm");
  const [photoErr, setPhotoErr] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [v2Err, setV2Err] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [token, setToken] = useState<string | null>(null);
  const [viz, setViz] = useState<VizStatus | null>(null);
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [ratio, setRatio] = useState<string | undefined>(undefined);
  const [slow, setSlow] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pipelineErr, setPipelineErr] = useState<string | null>(null);

  const pipeline = useRef<{ file: File; style: Style; promise: Promise<string> } | null>(null);
  const started = useRef(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl); }, [fileUrl]);

  function onPhoto(f: File | undefined) {
    if (!f) return;
    if (!started.current) {
      started.current = true;
      trackEvent("lights_visualizer_start");
    }
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFile(f);
    setFileUrl(URL.createObjectURL(f));
    setPhotoErr(false);
    setPipelineErr(null);
  }

  /** Upload → start generation. Resolves to the design token. */
  function startPipeline(f: File, s: Style): Promise<string> {
    const promise = (async () => {
      const { blob, width, height } = await downscale(f);
      setBeforeUrl(URL.createObjectURL(blob));
      if (width && height) setRatio(`${width} / ${height}`);
      const form = new FormData();
      form.append("photo", blob, blob === f ? f.name : "house.jpg");
      form.append("utm", JSON.stringify(getUtm()));
      form.append("website", honeypotRef.current?.value ?? "");
      const up = await api<{ token: string; width: number | null; height: number | null }>("/api/holiday-lights/upload", {
        method: "POST",
        body: form,
      });
      trackEvent("lights_visualizer_upload", { style: s });
      if (up.width && up.height) setRatio(`${up.width} / ${up.height}`);
      setToken(up.token);
      const st = await api<VizStatus>("/api/holiday-lights/visualize", json({ token: up.token, style: s }));
      setViz(st);
      return up.token;
    })();
    pipeline.current = { file: f, style: s, promise };
    // Surface failures without an unhandled rejection; v2 submit re-awaits and reports.
    promise.catch((e) => setPipelineErr(e instanceof Error ? e.message : "Upload failed."));
    return promise;
  }

  async function onV1(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setPhotoErr(true);
      photoRef.current?.closest(".field")?.scrollIntoView({ block: "center" });
      return;
    }
    setFailed(false);
    setSlow(false);

    // "Try another style" on an unlocked design → same photo, new style.
    if (token && viz?.unlocked && pipeline.current?.file === file) {
      try {
        setViz(await api<VizStatus>(`/api/holiday-lights/visualize/${token}/restyle`, json({ style })));
        setStep("v3");
      } catch (err) {
        toast(err instanceof Error ? err.message : "Couldn't start a new style.");
      }
      return;
    }

    const p = pipeline.current;
    if (!p || p.file !== file || p.style !== style || pipelineErr) {
      setToken(null);
      setViz(null);
      setPipelineErr(null);
      startPipeline(file, style);
    }
    setStep("v2");
    setTimeout(() => nameRef.current?.focus(), 0);
  }

  async function onV2(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setV2Err("Enter your first name.");
    if (phoneDigits(phone).length !== 10) return setV2Err("Enter a 10-digit mobile number.");
    if (!consent) return setV2Err("Check the box so we can text your design.");
    setV2Err(null);
    setBusy(true);
    try {
      let t: string;
      try {
        t = await pipeline.current!.promise;
      } catch (err) {
        setStep("v1");
        setPipelineErr(err instanceof Error ? err.message : "Upload failed.");
        return;
      }
      const st = await api<VizStatus>(
        `/api/holiday-lights/visualize/${t}/unlock`,
        json({ name: name.trim(), phone, consent }),
      );
      trackGenerateLead("holiday_visualizer");
      trackEvent("lights_visualizer_lead");
      trackMetaEvent("Lead", { content_name: "holiday_visualizer" });
      setViz(st);
      setStep(st.status === "ready" && st.unlocked ? "v4" : "v3");
    } catch (err) {
      setV2Err(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  // Poll while generating: quietly during v2 (for the blurred teaser), visibly during v3.
  useEffect(() => {
    if (!token || (step !== "v2" && step !== "v3")) return;
    if (step === "v2" && viz?.status === "ready") return;
    let alive = true;
    const startedAt = Date.now();
    const tick = async () => {
      try {
        const st = await api<VizStatus>(`/api/holiday-lights/visualize/${token}`, { cache: "no-store" });
        if (!alive) return;
        setViz(st);
        if (step === "v3") {
          if (st.status === "failed") setFailed(true);
          else if (st.status === "ready" && st.unlocked) setStep("v4");
          if (Date.now() - startedAt > SLOW_MS) setSlow(true);
        }
      } catch {
        /* keep polling */
      }
    };
    const id = setInterval(tick, step === "v3" ? POLL_MS : TEASER_POLL_MS);
    tick();
    return () => {
      alive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, step, viz?.status === "ready"]);

  useEffect(() => {
    if (step === "v4") trackEvent("lights_visualizer_view", { style });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function retry() {
    if (!token) return;
    setFailed(false);
    setSlow(false);
    try {
      setViz(await api<VizStatus>(`/api/holiday-lights/visualize/${token}/restyle`, json({ style })));
    } catch (err) {
      setFailed(true);
      toast(err instanceof Error ? err.message : "Couldn't try again.");
    }
  }

  async function textMe() {
    if (!token) return;
    try {
      await api(`/api/holiday-lights/visualize/${token}/text`, { method: "POST" });
      toast("Sent! Check your texts.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't send the text.");
    }
  }

  async function share() {
    if (!viz?.shareUrl) return;
    const data = { title: "My house, lit up for Christmas", text: "Check out my house lit up 🎄", url: viz.shareUrl };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(viz.shareUrl);
      toast("Link copied.");
    } catch {
      /* share sheet dismissed */
    }
  }

  const teaserUrl = step === "v2" && viz?.status === "ready" ? viz.imageUrl : null;

  return (
    <div className="vcard" id="vcard" data-step={step}>
      <form id="v1" hidden={step !== "v1"} onSubmit={onV1} noValidate>
        <p className="steplbl">Step 1 of 2 · Your photo</p>
        <label className="field">
          <span>Front of your house</span>
          <span className="drop" id="drop">
            {fileUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="Preview of your photo" src={fileUrl} />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            )}
            <span id="drop-txt">{fileUrl ? "Photo added. Tap to change." : "Take or upload a photo"}</span>
          </span>
          <input ref={photoRef} className="vh" type="file" id="photo" accept="image/*" onChange={(e) => onPhoto(e.target.files?.[0])} />
        </label>
        <p className="hint">Straight-on photo of the front works best, ideally at dusk.</p>
        {/* Honeypot for bots — hidden from people and assistive tech. */}
        <input ref={honeypotRef} type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="vh" defaultValue="" />
        {photoErr && <p className="err" id="photo-err">Add a photo of the front of your house.</p>}
        {pipelineErr && <p className="err">{pipelineErr}</p>}
        <fieldset style={{ border: 0, padding: 0, margin: "0 0 14px" }}>
          <legend style={{ fontWeight: 600, fontSize: ".92rem", marginBottom: 6, padding: 0 }}>Pick a style</legend>
          <div className="opts">
            {STYLES.map((s) => (
              <label className="opt" key={s.value}>
                <input className="vh" type="radio" name="style" value={s.value} checked={style === s.value} onChange={() => setStyle(s.value)} />
                <span style={{ "--c": s.color } as React.CSSProperties}>
                  <i />
                  {s.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <button className="btn btn-gold btn-block" type="submit">
          {viz?.unlocked ? "Light it up" : "Next"}
        </button>
      </form>

      <form id="v2" hidden={step !== "v2"} onSubmit={onV2} noValidate>
        <p className="steplbl">Step 2 of 2 · Where should we text it?</p>
        {teaserUrl && (
          <div className="teaser" data-testid="viz-teaser">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={teaserUrl} alt="Blurred preview of your house lit up" />
            <span>Your house is ready. Enter your number to see it.</span>
          </div>
        )}
        <label className="field">
          <span>First name</span>
          <input ref={nameRef} className="input" id="v-name" autoComplete="given-name" required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span>Mobile number</span>
          <PhoneInput id="v-tel" required value={phone} onValueChange={setPhone} />
        </label>
        {pipelineErr && (
          <p className="err">
            {pipelineErr}{" "}
            <button type="button" className="link" onClick={() => setStep("v1")}>Change photo</button>
          </p>
        )}
        {v2Err && <p className="err" id="v-err">{v2Err}</p>}
        <label className="consent">
          <input type="checkbox" id="v-consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>{SMS_CONSENT_TEXT}</span>
        </label>
        <button className="btn btn-gold btn-block" type="submit" disabled={busy}>
          {busy ? "One moment…" : "Show my house lit up"}
        </button>
        <p className="fine" style={{ margin: "6px 0 0" }}>
          <button type="button" className="link" id="v-back" onClick={() => setStep("v1")}>
            Back
          </button>
        </p>
      </form>

      <div id="v3" className="gen" hidden={step !== "v3"} aria-live="polite">
        {failed ? (
          <>
            <p><b>We couldn&apos;t light this one.</b></p>
            <p className="fine" style={{ margin: "0 auto 12px" }}>Try a straight-on photo of the front of the house.</p>
            {viz?.canRestyle !== false && (
              <button type="button" className="btn btn-gold btn-block" onClick={retry}>Try again</button>
            )}
            <p style={{ margin: "10px 0 0" }}>
              <button type="button" className="btn btn-out btn-block" onClick={() => { setFailed(false); setStep("v1"); }}>
                Pick a different photo or style
              </button>
            </p>
          </>
        ) : (
          <>
            <p><b>Lighting up your house…</b></p>
            <div className="bar-track" aria-hidden="true"><div className="bar-fill indet" /></div>
            <p className="fine" style={{ margin: "0 auto" }}>
              {slow ? "Still working… we'll also text it to you." : "This takes a few seconds."}
            </p>
          </>
        )}
      </div>

      <div id="v4" hidden={step !== "v4"}>
        <p className="steplbl">Concept preview</p>
        <div className="vhouse" id="v-result" data-testid="viz-result" data-locked={viz?.unlocked ? "false" : "true"}>
          {step === "v4" && viz?.imageUrl && (
            <CompareSlider
              label="Your house"
              tagLeft="Before"
              tagRight="Concept preview"
              ratio={ratio}
              tagsTop
              // eslint-disable-next-line @next/next/no-img-element
              before={<img src={beforeUrl ?? fileUrl ?? ""} alt="" />}
              // eslint-disable-next-line @next/next/no-img-element
              after={<img src={viz.imageUrl} alt="" />}
            />
          )}
        </div>
        <p className="fine" id="v-msg">
          Here&apos;s your house{name.trim() ? `, ${name.trim()}` : ""}. We texted you the link too. Artistic concept, not your design or price.
        </p>
        <CtaButton act="design" className="btn btn-gold btn-block">Design it &amp; get my exact price</CtaButton>
        <div className="acts2">
          <button type="button" className="btn btn-out" onClick={textMe}>Text me this</button>
          <button type="button" className="btn btn-out" onClick={share}>Share</button>
        </div>
        {viz?.canRestyle !== false && (
          <p style={{ margin: "10px 0 0" }}>
            <button type="button" className="btn btn-out btn-block" id="v-reset" onClick={() => setStep("v1")}>
              Try another style
            </button>
          </p>
        )}
        <p className="fine" style={{ margin: "10px 0 0", textAlign: "center" }}>
          <CtaButton act="reserve" className="link">Reserve my week ($199)</CtaButton>
        </p>
      </div>
    </div>
  );
}
