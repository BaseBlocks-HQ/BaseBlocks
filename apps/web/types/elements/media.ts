/**
 * Media element types and content definitions
 * Media elements for images, videos, audio, and files
 */

// Media element types
export type MediaType =
  | "image" // Single image (moved from blocks)
  | "file" // Downloadable file (moved from blocks)
  | "video" // Video player (new)
  | "audio" // Audio player (new)
  | "youtube-embed" // YouTube embed (new)
  | "gallery"; // Image gallery (new)

// Media content interfaces

export interface ImageContent {
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  objectFit?: "contain" | "cover" | "fill" | "none";
}

export interface FileContent {
  url: string;
  filename: string;
  size?: number;
  mimeType?: string;
}

export interface VideoContent {
  url: string;
  poster?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
}

export interface AudioContent {
  url: string;
  title?: string;
  autoplay?: boolean;
  loop?: boolean;
  controls?: boolean;
}

export interface YouTubeEmbedContent {
  videoId: string;
  title?: string;
  autoplay?: boolean;
  startTime?: number;
}

export interface GalleryContent {
  images: Array<{
    id: string;
    url: string;
    alt?: string;
    caption?: string;
  }>;
  columns?: number;
  gap?: "small" | "medium" | "large";
}

// Union of all media content types
export type MediaContentUnion =
  | ImageContent
  | FileContent
  | VideoContent
  | AudioContent
  | YouTubeEmbedContent
  | GalleryContent;

// Default content for new media elements
export const DEFAULT_MEDIA_CONTENT: Record<MediaType, MediaContentUnion> = {
  image: { url: "" },
  file: { url: "", filename: "" },
  video: { url: "", controls: true },
  audio: { url: "", controls: true },
  "youtube-embed": { videoId: "" },
  gallery: { images: [], columns: 3, gap: "medium" },
};
