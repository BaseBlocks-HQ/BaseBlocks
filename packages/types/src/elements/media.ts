export type MediaType = "image"; // Single image

export interface ImageContent {
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  objectFit?: "contain" | "cover" | "fill" | "none";
}

export type MediaContentUnion = ImageContent;

export const DEFAULT_MEDIA_CONTENT: Record<MediaType, MediaContentUnion> = {
  image: { url: "" },
};
