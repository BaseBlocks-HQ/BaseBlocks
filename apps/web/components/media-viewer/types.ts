/**
 * Media Viewer Types
 *
 * Extensible type system for the media viewer component.
 * Add new viewer types by extending MediaFileType and implementing ViewerComponent.
 */

export type MediaFileType =
  | "pdf"
  | "image"
  | "video"
  | "audio"
  | "office"
  | "text"
  | "unknown";

export interface MediaFile {
  url: string;
  filename: string;
  contentType: string;
  size?: number;
  /** Optional search term for highlighting in document viewers */
  searchTerm?: string;
  /** Whether to show download button (defaults to true) */
  allowDownload?: boolean;
}

export interface ViewerProps {
  file: MediaFile;
  onClose: () => void;
  /** Callback to render viewer-specific controls in the unified toolbar */
  renderControls?: (controls: React.ReactNode) => void;
}

/**
 * Viewer component registry type
 * Each viewer is responsible for rendering a specific file type
 */
export interface ViewerConfig {
  /** File type this viewer handles */
  type: MediaFileType;
  /** Human-readable name */
  label: string;
  /** Check if this viewer can handle the given content type */
  canHandle: (contentType: string) => boolean;
  /** The viewer component */
  component: React.ComponentType<ViewerProps>;
}

/**
 * Determine the media file type from content type
 */
export function getMediaFileType(contentType: string): MediaFileType {
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

  // Office documents
  if (
    ct.includes("officedocument") ||
    ct.includes("msword") ||
    ct.includes("ms-excel") ||
    ct.includes("ms-powerpoint") ||
    ct.includes("opendocument")
  ) {
    return "office";
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
 * Check if a content type is viewable (has a dedicated viewer)
 */
export function isViewable(contentType: string): boolean {
  const type = getMediaFileType(contentType);
  return type !== "unknown";
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? (parts.pop()?.toLowerCase() ?? "") : "";
}
