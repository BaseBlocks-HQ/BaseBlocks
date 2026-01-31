/**
 * Image media element
 * Single image with caption support
 */

import { Image } from "lucide-react";
import { registerElement } from "../../registry";
import { DEFAULT_MEDIA_CONTENT } from "@/types/elements";
import { ImagePreview } from "./image-preview";

// Re-export existing renderer (no editor exists yet)
export { ImageRenderer } from "@/components/blocks/renderer/image-renderer";
export { ImagePreview } from "./image-preview";

// Register the element
registerElement({
  type: "image",
  category: "media",
  label: "Image",
  description: "Single image with caption",
  icon: Image,
  keywords: ["image", "picture", "photo", "graphic"],
  preview: ImagePreview,
  defaultContent: DEFAULT_MEDIA_CONTENT.image,
});
