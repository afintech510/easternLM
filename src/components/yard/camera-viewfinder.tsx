"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, SwitchCamera, Zap, ZapOff, X } from "lucide-react";

interface Props {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

export function CameraViewfinder({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    // Stop existing stream
    streamRef.current?.getTracks().forEach((t) => t.stop());

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 2560 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);
        setError("");

        // Check torch capability
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities?.() as any;
        setHasTorch(!!caps?.torch);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Camera access denied or unavailable.");
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSwitchCamera() {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    setTorchOn(false);
    startCamera(next);
  }

  function handleToggleTorch() {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    const next = !torchOn;
    track.applyConstraints({ advanced: [{ torch: next } as any] }).catch(() => {});
    setTorchOn(next);
  }

  function handleCapture() {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          navigator.vibrate?.(50);
          onCapture(blob);
        }
      },
      "image/jpeg",
      0.85,
    );
  }

  function handleFileFallback(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onCapture(file);
  }

  // Draw corner guides on canvas overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !ready) return;

    function draw() {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c) return;

      const w = v.clientWidth;
      const h = v.clientHeight;
      if (c.width !== w || c.height !== h) {
        c.width = w;
        c.height = h;
      }

      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      // Document zone: centered, ~8.5:11 aspect (portrait letter)
      const marginX = w * 0.08;
      const docW = w - marginX * 2;
      const docH = Math.min(docW * (11 / 8.5), h * 0.72);
      const docX = marginX;
      const docY = (h - docH) / 2;

      // Semi-transparent overlay outside document zone
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.fillRect(0, 0, w, docY);
      ctx.fillRect(0, docY + docH, w, h - docY - docH);
      ctx.fillRect(0, docY, docX, docH);
      ctx.fillRect(docX + docW, docY, w - docX - docW, docH);

      // Corner brackets
      const arm = Math.min(36, docW * 0.08);
      const lw = 3;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = lw;
      ctx.lineCap = "round";

      // Top-left
      ctx.beginPath();
      ctx.moveTo(docX, docY + arm);
      ctx.lineTo(docX, docY);
      ctx.lineTo(docX + arm, docY);
      ctx.stroke();

      // Top-right
      ctx.beginPath();
      ctx.moveTo(docX + docW - arm, docY);
      ctx.lineTo(docX + docW, docY);
      ctx.lineTo(docX + docW, docY + arm);
      ctx.stroke();

      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(docX, docY + docH - arm);
      ctx.lineTo(docX, docY + docH);
      ctx.lineTo(docX + arm, docY + docH);
      ctx.stroke();

      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(docX + docW - arm, docY + docH);
      ctx.lineTo(docX + docW, docY + docH);
      ctx.lineTo(docX + docW, docY + docH - arm);
      ctx.stroke();
    }

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(video);
    return () => ro.disconnect();
  }, [ready]);

  // Fallback UI when camera is denied
  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-black px-6 text-center">
        <Camera className="mb-4 size-16 text-white/40" />
        <p className="mb-2 text-lg font-medium text-white">{error}</p>
        <p className="mb-6 text-sm text-white/60">Tap below to use your phone&apos;s camera app instead.</p>
        <label className="cursor-pointer rounded-xl bg-white px-8 py-4 text-base font-semibold text-black">
          Open Camera
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileFallback}
          />
        </label>
        <button onClick={onClose} className="mt-4 text-sm text-white/50">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-black">
      {/* Video feed */}
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {/* Canvas overlay for corner guides */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 flex items-center justify-between p-4">
        <button
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
        >
          <X className="size-5" />
        </button>
        <p className="text-sm font-medium text-white/80 drop-shadow">
          Align document in frame
        </p>
        <div className="size-10" /> {/* spacer */}
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-8 bg-gradient-to-t from-black/70 to-transparent pb-10 pt-16">
        {/* Flash toggle */}
        <button
          onClick={handleToggleTorch}
          disabled={!hasTorch}
          className={`flex size-11 items-center justify-center rounded-full transition-colors ${
            hasTorch ? "bg-white/15 text-white" : "bg-white/5 text-white/20"
          }`}
        >
          {torchOn ? <Zap className="size-5" /> : <ZapOff className="size-5" />}
        </button>

        {/* Capture button */}
        <button
          onClick={handleCapture}
          disabled={!ready}
          className="flex size-[72px] items-center justify-center rounded-full border-4 border-white bg-white/10 transition-transform active:scale-90"
        >
          <div className="size-14 rounded-full bg-white" />
        </button>

        {/* Switch camera */}
        <button
          onClick={handleSwitchCamera}
          className="flex size-11 items-center justify-center rounded-full bg-white/15 text-white"
        >
          <SwitchCamera className="size-5" />
        </button>
      </div>
    </div>
  );
}
