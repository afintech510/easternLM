import { useId, type ReactElement } from "react";

export type LightStyle = "warm" | "multi" | "candy" | "elegant";

type HouseSvgProps = {
  night?: boolean;
  style?: LightStyle;
  wreath?: boolean;
  /** SVG preserveAspectRatio. */
  par?: string;
};

const WINDOWS: [number, number][] = [[148, 186], [206, 186], [346, 186], [404, 186]];
const STARS: [number, number][] = [[40, 30], [120, 64], [214, 24], [420, 38], [506, 72], [566, 28], [336, 96], [84, 110], [470, 16]];
const BUSH_BULBS: [number, number][] = [[134, 262], [158, 258], [142, 270], [446, 258], [470, 262], [454, 270]];

/**
 * Illustrated house at day or night with C9 bulbs along the roofline.
 * Port of the artifact's `house()` generator. Pure render, so it works in server
 * and client components; `useId` keeps the gradient id hydration-safe.
 */
export function HouseSvg({ night = false, style = "warm", wreath = false, par = "xMidYMid slice" }: HouseSvgProps) {
  const uid = useId().replace(/:/g, "");
  const N = night;
  let k = 0;
  const out: ReactElement[] = [];
  let key = 0;

  function col(): string {
    const i = k++;
    if (style === "multi") return ["#ff5148", "#ffb62e", "#46c46f", "#4a95ff", "#ffd84d"][i % 5];
    if (style === "candy") return i % 2 ? "#ffffff" : "#ff3d3d";
    if (style === "elegant") return "#fff3d6";
    return "#ffdf9c";
  }
  function bulb(x: number, y: number) {
    const c = col();
    const h = k % 3;
    const cx = x.toFixed(1);
    const cy = y.toFixed(1);
    out.push(<circle key={key++} className={`h${h}`} cx={cx} cy={cy} r="8" fill={c} opacity=".3" />);
    out.push(<circle key={key++} cx={cx} cy={cy} r="3.4" fill={c} />);
  }
  function run(x1: number, y1: number, x2: number, y2: number, sp: number, skipLast: boolean) {
    const L = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(1, Math.round(L / sp));
    for (let i = 0; i <= n - (skipLast ? 1 : 0); i++) {
      const t = i / n;
      bulb(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
    }
  }

  const sky = N ? ["#0c1a2b", "#2f5577"] : ["#bcd6e4", "#eaf0ee"];
  const gid = `sk${uid}`;
  const glass = N ? "#ffcf7a" : "#9dbfce";
  const mullion = N ? "#0b141b" : "#f3efe6";
  const shrub = N ? "#0e2620" : "#6f8f68";

  if (wreath || style === "elegant") {
    out.push(<circle key={key++} cx="300" cy="226" r="13" fill="none" stroke="#2f7a4d" strokeWidth="6" />);
    out.push(<rect key={key++} x="295" y="236" width="10" height="7" rx="2" fill="#c8312b" />);
    WINDOWS.forEach(([x, y]) => {
      out.push(<circle key={key++} cx={x + 23} cy={y - 6} r="8" fill="none" stroke="#2f7a4d" strokeWidth="4" />);
    });
  }
  if (N) {
    run(68, 158, 300, 50, 15, true);
    run(300, 50, 532, 158, 15, false);
    run(68, 163, 532, 163, 15, false);
    run(120, 156, 120, 270, 18, false);
    run(480, 156, 480, 270, 18, false);
    BUSH_BULBS.forEach(([x, y]) => bulb(x, y));
    run(62, 168, 30, 268, 16, false);
    run(570, 268, 538, 176, 16, false);
  }

  return (
    <svg viewBox="0 0 600 320" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio={par} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          {N ? <stop offset="0" style={{ stopColor: "var(--sky0)" }} /> : <stop offset="0" stopColor={sky[0]} />}
          {N ? <stop offset="1" style={{ stopColor: "var(--sky1)" }} /> : <stop offset="1" stopColor={sky[1]} />}
        </linearGradient>
      </defs>
      <rect width="600" height="320" fill={`url(#${gid})`} />
      {N && STARS.map(([x, y], i) => <circle key={`s${i}`} cx={x} cy={y} r="1.4" fill="#fff" opacity=".8" />)}
      <rect y="268" width="600" height="52" fill={N ? "#09131c" : "#a9bd96"} />
      <polygon points="24,272 62,168 100,272" fill={shrub} />
      <polygon points="500,272 538,176 576,272" fill={shrub} />
      <rect x="120" y="156" width="360" height="114" fill={N ? "#1c2b39" : "#cdbb9d"} />
      <polygon points="68,160 300,50 532,160" fill={N ? "#101a23" : "#6a6f73"} />
      <circle cx="300" cy="118" r="12" fill={glass} />
      {WINDOWS.map(([x, y]) => (
        <g key={`w${x}`}>
          <rect x={x} y={y} width="46" height="50" fill={glass} stroke={mullion} strokeWidth="3" />
          <path d={`M${x + 23} ${y}v50M${x} ${y + 25}h46`} stroke={mullion} strokeWidth="2" />
        </g>
      ))}
      <rect x="276" y="206" width="48" height="64" fill={N ? "#2b1d18" : "#6b4a36"} />
      <rect x="264" y="268" width="72" height="6" fill={N ? "#2a3b48" : "#b8ab95"} />
      <ellipse cx="146" cy="268" rx="30" ry="14" fill={shrub} />
      <ellipse cx="454" cy="268" rx="30" ry="14" fill={shrub} />
      {out}
    </svg>
  );
}
