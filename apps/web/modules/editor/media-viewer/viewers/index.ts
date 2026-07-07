"use client";

/**
 * Viewer components registry
 *
 * To add a new viewer:
 * 1. Create a new viewer component in this directory
 * 2. Add it to the viewerRegistry below
 * 3. Implement the canHandle function to match content types
 */

import dynamic from "next/dynamic";
import type { ViewerConfig } from "../types";
import { AudioViewer } from "./audio-viewer";
import { ImageViewer } from "./image-viewer";
import { TextViewer } from "./text-viewer";
import { UnknownViewer } from "./unknown-viewer";
import { VideoViewer } from "./video-viewer";

// Dynamic import for PDF viewer to avoid SSR issues with pdfjs-dist
const PdfViewer = dynamic(
  () => import("./pdf-viewer").then((mod) => mod.PdfViewer),
  { ssr: false },
);

/**
 * Registry of all available viewers
 * Order matters - first matching viewer will be used
 */
const viewerRegistry: ViewerConfig[] = [
  {
    type: "pdf",
    label: "PDF Viewer",
    canHandle: (ct) => ct.includes("pdf"),
    component: PdfViewer,
  },
  {
    type: "image",
    label: "Image Viewer",
    canHandle: (ct) => ct.startsWith("image/"),
    component: ImageViewer,
  },
  {
    type: "video",
    label: "Video Player",
    canHandle: (ct) => ct.startsWith("video/"),
    component: VideoViewer,
  },
  {
    type: "audio",
    label: "Audio Player",
    canHandle: (ct) => ct.startsWith("audio/"),
    component: AudioViewer,
  },
  {
    type: "text",
    label: "Text Viewer",
    canHandle: (ct) =>
      ct.startsWith("text/") ||
      ct.includes("json") ||
      ct.includes("xml") ||
      ct.includes("javascript") ||
      ct.includes("typescript"),
    component: TextViewer,
  },
];

/**
 * Get the appropriate viewer for a content type
 */
export function getViewer(contentType: string): ViewerConfig {
  const viewer = viewerRegistry.find((v) => v.canHandle(contentType));

  if (viewer) {
    return viewer;
  }

  // Return unknown viewer as fallback
  return {
    type: "unknown",
    label: "File",
    canHandle: () => true,
    component: UnknownViewer,
  };
}
