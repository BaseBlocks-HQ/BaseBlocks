import { api } from "@baseblocks/backend";
import { ConvexHttpClient } from "convex/browser";
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  let siteName = subdomain;

  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (convexUrl) {
      const client = new ConvexHttpClient(convexUrl);
      const siteData = await client.query(api.sites.queries.getWithDefaultPage, {
        teamSlug: subdomain,
      });
      if (siteData?.site?.name) siteName = siteData.site.name;
    }
  } catch {
    // fall back to subdomain
  }

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
        {/* BaseBlocks attribution */}
        <div style={{ display: "flex" }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "#888",
            }}
          >
            BaseBlocks
          </span>
        </div>

        {/* Site name */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              fontSize: 80,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1.0,
              color: "#111",
              display: "flex",
            }}
          >
            {siteName}
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
