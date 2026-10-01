"use client";

import { useEffect, useRef } from "react";

type Flake = {
  x: number; y: number; r: number; vy: number;
  sway: number; swaySp: number; ph: number; rot: number; rotSp: number;
  shape: "crystal" | "star" | "dot"; arms: number;
  glintSp: number; glintPh: number; glintPow: number; hue: number; a: number;
};

/** Glistening random snowfall over the hero (ported from the v2 design's canvas script). */
export function Snowfall() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const hero = cv?.parentElement;
    const ctx = cv?.getContext("2d");
    if (!cv || !hero || !ctx) return;

    let W = 0, H = 0, last = 0, raf = 0, vis = true;
    const flakes: Flake[] = [];
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const R = (a: number, b: number) => a + Math.random() * (b - a);

    function make(initial: boolean): Flake {
      const depth = Math.pow(Math.random(), 1.6); // most flakes small/far, a few big/near
      const type = Math.random();
      return {
        x: R(0, W), y: initial ? R(-20, H) : R(-40, -5),
        r: 1 + depth * 6.5,
        vy: 14 + depth * 50 + R(0, 14),
        sway: R(6, 34), swaySp: R(0.4, 1.5), ph: R(0, 6.28),
        rot: R(0, 6.28), rotSp: R(-1.2, 1.2),
        shape: type < 0.38 ? "crystal" : type < 0.52 ? "star" : "dot",
        arms: Math.random() < 0.2 ? 8 : 6,
        glintSp: R(0.7, 2.6), glintPh: R(0, 6.28), glintPow: R(6, 16),
        hue: R(190, 230), a: R(0.55, 1),
      };
    }
    function size() {
      const r = hero!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cv!.width = W * dpr; cv!.height = H * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(140, Math.max(45, (W * H) / 9000)));
      while (flakes.length < n) flakes.push(make(true));
      flakes.length = n;
    }
    function crystal(f: Flake) {
      const L = f.r * 2.1;
      ctx!.lineWidth = Math.max(0.7, f.r * 0.22);
      ctx!.lineCap = "round";
      ctx!.beginPath();
      for (let i = 0; i < f.arms; i++) {
        const a = (i * Math.PI * 2) / f.arms, c = Math.cos(a), s = Math.sin(a);
        ctx!.moveTo(0, 0); ctx!.lineTo(c * L, s * L);
        const bx = c * L * 0.58, by = s * L * 0.58, bl = L * 0.36;
        ctx!.moveTo(bx, by); ctx!.lineTo(bx + Math.cos(a + 0.8) * bl, by + Math.sin(a + 0.8) * bl);
        ctx!.moveTo(bx, by); ctx!.lineTo(bx + Math.cos(a - 0.8) * bl, by + Math.sin(a - 0.8) * bl);
      }
      ctx!.stroke();
    }
    function star(f: Flake) {
      const L = f.r * 1.7;
      ctx!.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4, rr = i % 2 ? L * 0.45 : L;
        ctx!.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx!.closePath(); ctx!.fill();
    }
    function flare(x: number, y: number, len: number, alpha: number, hue: number) {
      ctx!.save(); ctx!.translate(x, y); ctx!.globalAlpha = alpha;
      const g = ctx!.createRadialGradient(0, 0, 0, 0, 0, len * 0.55);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.35, `hsla(${hue},100%,88%,.55)`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx!.fillStyle = g; ctx!.beginPath(); ctx!.arc(0, 0, len * 0.55, 0, 6.283); ctx!.fill();
      ctx!.fillStyle = "#fff"; ctx!.beginPath();
      ctx!.moveTo(0, -len); ctx!.quadraticCurveTo(len * 0.07, -len * 0.07, len, 0);
      ctx!.quadraticCurveTo(len * 0.07, len * 0.07, 0, len); ctx!.quadraticCurveTo(-len * 0.07, len * 0.07, -len, 0);
      ctx!.quadraticCurveTo(-len * 0.07, -len * 0.07, 0, -len); ctx!.fill();
      ctx!.restore();
    }
    function draw(f: Flake, t: number) {
      const x = f.x + Math.sin(t * f.swaySp + f.ph) * f.sway, y = f.y;
      const tw = Math.pow(Math.max(0, Math.sin(t * f.glintSp + f.glintPh)), f.glintPow);
      const base = f.a * (0.7 + 0.3 * Math.sin(t * f.glintSp * 0.6 + f.glintPh));
      ctx!.save(); ctx!.translate(x, y); ctx!.rotate(f.rot);
      ctx!.globalAlpha = Math.min(1, base + tw * 0.4);
      ctx!.shadowColor = `hsla(${f.hue},100%,85%,${0.55 + tw * 0.45})`;
      ctx!.shadowBlur = 3 + f.r * 0.8 + tw * 14;
      const tint = `hsl(${f.hue},100%,${94 + tw * 6}%)`;
      ctx!.strokeStyle = tint; ctx!.fillStyle = tint;
      if (f.shape === "crystal") crystal(f);
      else if (f.shape === "star") star(f);
      else { ctx!.beginPath(); ctx!.arc(0, 0, f.r * 0.8, 0, 6.283); ctx!.fill(); }
      ctx!.restore();
      if (tw > 0.06) flare(x, y, f.r * (2.4 + tw * 3.2), Math.min(1, tw * 1.1), f.hue);
    }
    function frame(ts: number) {
      const t = ts / 1000, dt = Math.min(0.05, (ts - last) / 1000 || 0);
      last = ts;
      ctx!.clearRect(0, 0, W, H);
      for (let i = 0; i < flakes.length; i++) {
        let f = flakes[i];
        if (!still) {
          f.y += f.vy * dt; f.rot += f.rotSp * dt;
          if (f.y > H + 20) flakes[i] = f = make(false);
        }
        draw(f, t);
      }
    }
    function loop(ts: number) {
      if (vis) frame(ts); else last = ts;
      raf = requestAnimationFrame(loop);
    }

    size();
    const onResize = () => { size(); if (still) frame(performance.now()); };
    window.addEventListener("resize", onResize);
    const io = new IntersectionObserver((e) => { vis = e[0].isIntersecting; }, { threshold: 0 });
    io.observe(hero);
    if (still) frame(performance.now());
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas id="snow" ref={ref} aria-hidden="true" />;
}
