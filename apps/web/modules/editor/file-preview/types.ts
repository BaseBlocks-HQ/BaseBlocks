/**
 * File Preview Types
 *
 * Extensible type system for file preview rendering.
 * Add new viewer types by extending PreviewFileType and implementing ViewerComponent.
 */

export type PreviewFileType =
  | "pdf"
  | "image"
  | "video"
  | "audio"
  | "text"
  | "unknown";

export interface PreviewFile {
  url: string;
  filename: string;
  contentType: string;
  size?: number;
  /** Optional document id used to build a shareable page deep link */
  deepLinkId?: string;
  /** Optional search term for highlighting in document viewers */
  searchTerm?: string;
  /** Whether to show download button (defaults to true) */
  allowDownload?: boolean;
}

export interface ViewerProps {
  file: PreviewFile;
  onClose: () => void;
  /** Callback to render viewer-specific controls in the unified toolbar */
  renderControls?: (controls: React.ReactNode) => void;
}

/**
 * Viewer component registry type
 * Each viewer is responsible for rendering a specific file type
 */
export interface PreviewViewerConfig {
  /** File type this viewer handles */
  type: PreviewFileType;
  /** Human-readable name */
  label: string;
  /** Check if this viewer can handle the given content type */
  canHandle: (contentType: string) => boolean;
  /** The viewer component */
  component: React.ComponentType<ViewerProps>;
}

/**
 * Determine the preview type from content type
 */
export function getPreviewFileType(contentType: string): PreviewFileType {
  const ct = contentType.toLowerCase();

  // PDF
  if (ct.includes("pdf")) {
    return "pdf";
  }

  // Images
  if (ct.startsWith("image/")) {
    return "image";
  }

  // Video
  if (ct.startsWith("video/")) {
    return "video";
  }

  // Audio
  if (ct.startsWith("audio/")) {
    return "audio";
  }

  // Text-based files
  if (
    ct.startsWith("text/") ||
    ct.includes("json") ||
    ct.includes("xml") ||
    ct.includes("javascript") ||
    ct.includes("typescript")
  ) {
    return "text";
  }

  return "unknown";
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? (parts.pop()?.toLowerCase() ?? "") : "";
}
