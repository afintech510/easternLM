import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const BULBS = ["#ff5148", "#ffb62e", "#46c46f", "#4a95ff", "#ffd84d"];

/** Default Open Graph card for Tinsel Time pages (1200×630). */
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 80px",
          background: "linear-gradient(135deg, #b3122b 0%, #6e0818 50%, #0f7a42 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", gap: 26, marginBottom: 40 }}>
          {Array.from({ length: 14 }, (_, i) => (
            <div
              key={i}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                background: BULBS[i % BULBS.length],
                boxShadow: `0 0 36px 10px ${BULBS[i % BULBS.length]}`,
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.05 }}>Tinsel Time Long Island</div>
        <div style={{ fontSize: 44, marginTop: 20, color: "#ffffff" }}>Christmas lights, professionally designed and installed.</div>
        <div style={{ fontSize: 32, marginTop: 24, color: "#fffaf0" }}>See your own house lit up, free.</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
