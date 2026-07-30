import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const baseBlocksOgAlt = "BaseBlocks - From idea to site in minutes.";
export const baseBlocksOgSize = { width: 1200, height: 630 };
export const baseBlocksOgContentType = "image/png";

const halftoneHeight = 390;
const halftoneWidth = baseBlocksOgSize.width;
const newsreaderFontBase64 =
  "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";
const newsreaderFontBytes = Buffer.from(newsreaderFontBase64, "base64");
const newsreaderFont = newsreaderFontBytes.buffer.slice(
  newsreaderFontBytes.byteOffset,
  newsreaderFontBytes.byteOffset + newsreaderFontBytes.byteLength,
) as ArrayBuffer;
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
