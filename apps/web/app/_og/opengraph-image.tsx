import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const baseBlocksOgAlt =
  "BaseBlocks - Build, publish, and share internal sites in minutes.";
export const baseBlocksOgSize = { width: 1200, height: 630 };
export const baseBlocksOgContentType = "image/png";

interface BaseBlocksOpenGraphImageOptions {
  name?: string;
}

const brandName = "BaseBlocks";
const brandYellow = "#f59e0b";

async function getLogoDataUrl() {
  const logoPath = join(
    process.cwd(),
    "public",
    "brand",
    "baseblocks-logo.png",
  );
  const logo = await readFile(logoPath);

  return `data:image/png;base64,${Buffer.from(logo).toString("base64")}`;
}

function sanitizeTitle(value: string | undefined) {
  const title = value?.trim() || brandName;

  if (title.length <= 60) {
    return title;
  }

  return `${title.slice(0, 57).trim()}...`;
}

function getTitleSize(title: string, isBrand: boolean) {
  if (isBrand) {
    return 76;
  }

  if (title.length > 44) {
    return 56;
  }

  if (title.length > 28) {
    return 66;
  }

  return 76;
}

function LogoDock({ logoSrc }: { logoSrc: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 148,
        left: 80,
        display: "flex",
        width: 360,
        height: 190,
        alignItems: "center",
        justifyContent: "flex-start",
      }}
    >
      <div
        style={{
          position: "absolute",
          display: "flex",
          left: -22,
          top: -24,
          width: 382,
          height: 238,
          backgroundImage:
            "radial-gradient(circle, #111111 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          opacity: 0.075,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -6,
          top: 18,
          display: "flex",
          width: 174,
          height: 174,
          borderRadius: 48,
          background:
            "radial-gradient(circle at 50% 100%, rgba(245, 158, 11, 0.12), transparent 64%)",
          filter: "blur(10px)",
        }}
      />
      <div
        style={{
          display: "flex",
          width: 164,
          height: 164,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderRadius: 44,
          background: "rgba(255, 255, 255, 0.84)",
          boxShadow:
            "0 0 0 1px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04), 0 24px 52px -16px rgba(0, 0, 0, 0.24)",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 132,
            height: 132,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderRadius: 32,
            background: "#ffffff",
            boxShadow:
              "0 0 0 1px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.9)",
          }}
        >
          {/* ImageResponse/Satori requires a native img element. */}
          {/* biome-ignore lint/performance/noImgElement: next/image cannot render inside ImageResponse. */}
          <img
            src={logoSrc}
            alt=""
            width={116}
            height={116}
            style={{
              width: 116,
              height: 116,
              borderRadius: 28,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function BrandHeadline() {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0 16px",
        color: "#111111",
        fontSize: 76,
        fontWeight: 700,
        letterSpacing: 0,
        lineHeight: 1,
      }}
    >
      <span>Build,</span>
      <span style={{ color: brandYellow, marginLeft: 16 }}>publish,</span>
      <span style={{ marginLeft: 16 }}>and share.</span>
    </div>
  );
}

export async function createBaseBlocksOpenGraphImage({
  name,
}: BaseBlocksOpenGraphImageOptions = {}) {
  // Failure modes:
  // - Logo asset is unavailable in local or deployed rendering.
  // - Long public site names need to stay inside the 1200x630 frame.
  // - ImageResponse supports a constrained subset of CSS layout.
  const logoSrc = await getLogoDataUrl();
  const title = sanitizeTitle(name);
  const isBrand = title === brandName;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        position: "relative",
        overflow: "hidden",
        background: "#fafafa",
        color: "#111111",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <LogoDock logoSrc={logoSrc} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px",
          width: "100%",
          height: "100%",
        }}
      >
        <div style={{ display: "flex" }}>
          <span
            style={{
              color: "#111111",
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: 0,
            }}
          >
            BaseBlocks
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {isBrand ? (
            <BrandHeadline />
          ) : (
            <div
              style={{
                display: "flex",
                maxWidth: 760,
                color: "#111111",
                fontSize: getTitleSize(title, isBrand),
                fontWeight: 700,
                letterSpacing: 0,
                lineHeight: 1,
              }}
            >
              {title}
            </div>
          )}
        </div>
      </div>
    </div>,
    baseBlocksOgSize,
  );
}
