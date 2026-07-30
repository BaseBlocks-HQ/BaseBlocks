import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const baseBlocksOgAlt = "BaseBlocks - From idea to site in minutes.";
export const baseBlocksOgSize = { width: 1200, height: 630 };
export const baseBlocksOgContentType = "image/png";

const halftoneHeight = 390;
const halftoneWidth = baseBlocksOgSize.width;
const newsreaderFont = fetch(
  "https://fonts.gstatic.com/s/newsreader/v26/cY9qfjOCX1hbuyalUrK49dLac06G1ZGsZBtoBCzBDXXD9JVF438weI_ADA.ttf",
).then((response) => {
  if (!response.ok) {
    throw new Error("Failed to load the Newsreader font for the OG image.");
  }

  return response.arrayBuffer();
});
const logoDataUrl = readFile(
  join(process.cwd(), "public", "brand", "baseblocks-mark.svg"),
  "utf8",
).then((svg) => {
  const blackLogo = svg.replaceAll("#FEFFFE", "#111111");

  return `data:image/svg+xml;base64,${Buffer.from(blackLogo).toString("base64")}`;
});

function smoothstep(edge0: number, edge1: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
}

function randomAt(column: number, row: number) {
  const value = 43_758.5453 * Math.sin(12.9898 * column + 78.233 * row);
  return value - Math.floor(value);
}

function createHalftoneDataUrl() {
  const spacing = 9;
  const columns = Math.ceil(halftoneWidth / spacing) + 1;
  const rows = Math.ceil(halftoneHeight / spacing) + 1;
  const strandThickness = 0.026;
  const strandDenominator = 2 * strandThickness * strandThickness;
  const circles: string[] = [];

  for (let row = 0; row < rows; row += 1) {
    const stagger = row % 2 === 0 ? 0 : spacing / 2;
    const y = row * spacing - spacing / 2;
    const normalizedY = y / halftoneHeight;

    for (let column = 0; column < columns; column += 1) {
      const x = column * spacing + stagger - spacing / 2;
      const normalizedX = x / halftoneWidth;
      const shapeX = Math.max(0, Math.min(1, normalizedX));
      const phase = shapeX * Math.PI * 4.4;
      const arch = 0.84 - 0.56 * Math.sin(Math.PI * shapeX) ** 1.35;
      const amplitude = 0.1 * (0.72 + 0.28 * Math.sin(Math.PI * shapeX));
      const strandAY = arch + amplitude * Math.sin(phase);
      const strandBY = arch - amplitude * Math.sin(phase);
      const distanceA = normalizedY - strandAY;
      const distanceB = normalizedY - strandBY;
      const depthA = 0.36 + 0.64 * (0.5 + 0.5 * Math.cos(phase));
      const depthB = 0.36 + 0.64 * (0.5 - 0.5 * Math.cos(phase));
      const strandA =
        Math.exp(-(distanceA * distanceA) / strandDenominator) * depthA;
      const strandB =
        Math.exp(-(distanceB * distanceB) / strandDenominator) * depthB;
      const edgeFade = smoothstep(0, 0.08, Math.min(shapeX, 1 - shapeX));
      const intensity = Math.min(1, strandA + strandB) * edgeFade;

      if (intensity < 0.025) {
        continue;
      }

      const random = randomAt(column, row);
      const radius = (0.3 + 4.2 * intensity) * (0.65 + 0.35 * random);
      const opacity = 0.12 + 0.76 * intensity;

      circles.push(
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius.toFixed(2)}" fill="#111111" fill-opacity="${opacity.toFixed(3)}"/>`,
      );
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${halftoneWidth}" height="${halftoneHeight}" viewBox="0 0 ${halftoneWidth} ${halftoneHeight}">${circles.join("")}</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export async function createBaseBlocksOpenGraphImage() {
  const [fontData, logoSrc] = await Promise.all([newsreaderFont, logoDataUrl]);
  const halftoneSrc = createHalftoneDataUrl();

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        position: "relative",
        overflow: "hidden",
        alignItems: "center",
        flexDirection: "column",
        background: "#ffffff",
        color: "#111111",
        fontFamily: "Newsreader",
      }}
    >
      {/* ImageResponse/Satori requires a native img element. */}
      {/* biome-ignore lint/performance/noImgElement: next/image cannot render inside ImageResponse. */}
      <img
        src={logoSrc}
        alt=""
        width={64}
        height={54}
        style={{
          position: "absolute",
          top: 44,
          width: 64,
          height: 54,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: 120,
          fontSize: 76,
          fontWeight: 400,
          letterSpacing: -2.5,
          lineHeight: 0.96,
          textAlign: "center",
        }}
      >
        <span>From idea to</span>
        <span>site in minutes</span>
      </div>

      {/* ImageResponse/Satori requires a native img element. */}
      {/* biome-ignore lint/performance/noImgElement: next/image cannot render inside ImageResponse. */}
      <img
        src={halftoneSrc}
        alt=""
        width={halftoneWidth}
        height={halftoneHeight}
        style={{
          position: "absolute",
          left: 0,
          bottom: -8,
          width: halftoneWidth,
          height: halftoneHeight,
        }}
      />
    </div>,
    {
      ...baseBlocksOgSize,
      fonts: [
        {
          name: "Newsreader",
          data: fontData,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
