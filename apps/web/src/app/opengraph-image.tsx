import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const alt = "EpiLens — Punjab COVID-19 Research Workbench";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0B1F3A",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "80px",
          fontFamily: "sans-serif",
          color: "#FFFFFF",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "10px",
              backgroundColor: "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: 800,
              color: "#FFFFFF",
            }}
          >
            E
          </div>
          <span style={{ fontSize: "36px", fontWeight: 800, letterSpacing: "-0.5px" }}>
            EpiLens
          </span>
          <span
            style={{
              marginLeft: "12px",
              fontSize: "16px",
              fontWeight: 600,
              padding: "4px 12px",
              borderRadius: "9999px",
              backgroundColor: "rgba(37,99,235,0.2)",
              border: "1px solid rgba(147,197,253,0.3)",
              color: "#93C5FD",
            }}
          >
            Punjab COVID-19 Research
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <h1
            style={{
              fontSize: "56px",
              fontWeight: 800,
              lineHeight: 1.15,
              maxWidth: "960px",
              color: "#FFFFFF",
            }}
          >
            Scientific modeling, forecast benchmarking & reproducible exports
          </h1>
          <p
            style={{
              fontSize: "24px",
              color: "#94A3B8",
              maxWidth: "840px",
              lineHeight: 1.4,
            }}
          >
            Rigorous continuous-time SIR compartmental models with rolling 13-origin evaluation,
            paired bootstrap intervals, and 27-combination parameter sensitivity.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: "24px",
            color: "#64748B",
            fontSize: "18px",
          }}
        >
          <span>Region: Punjab, India (PB) • Disease: COVID-19</span>
          <span>Open Science & Full Provenance</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
