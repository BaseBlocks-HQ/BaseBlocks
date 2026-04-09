import { ImageResponse } from "next/og";

export const alt =
  "BaseBlocks — Build, publish, and share internal sites in minutes.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        background: "#fafafa",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Gradient accent */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "60%",
          background:
            "radial-gradient(ellipse 80% 60% at 50% 110%, rgba(99,102,241,0.14) 0%, rgba(139,92,246,0.08) 40%, transparent 70%)",
          display: "flex",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px",
          width: "100%",
          position: "relative",
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex" }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "#111",
            }}
          >
            BaseBlocks
          </span>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1.0,
              color: "#111",
              display: "flex",
              flexWrap: "wrap",
              gap: "0 16px",
            }}
          >
            <span>Build, publish,</span>
            <span style={{ color: "#6366f1" }}>and share.</span>
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#888",
              display: "flex",
              marginTop: 12,
            }}
          >
            The collaborative site builder for teams.
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
