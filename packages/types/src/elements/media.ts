/**
 * Media element types and content definitions
 * Media elements for images
 */

// Media element types
export type MediaType = "image"; // Single image

// Media content interfaces

export interface ImageContent {
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  objectFit?: "contain" | "cover" | "fill" | "none";
}

// Union of all media content types
export type MediaContentUnion = ImageContent;

// Default content for new media elements
export const DEFAULT_MEDIA_CONTENT: Record<MediaType, MediaContentUnion> = {
  image: { url: "" },
};
