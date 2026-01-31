/**
 * Image media element
 * Single image with caption support
 */

import { DEFAULT_MEDIA_CONTENT } from "@/types/elements";
import { Image } from "lucide-react";
import { registerElement } from "../../registry";
import { ImagePreview } from "./image-preview";
import { ImageRenderer } from "./image-renderer";

// Re-export components (no editor exists yet)
export { ImageRenderer, ImagePreview };

// Register the element
registerElement({
  type: "image",
  category: "media",
  label: "Image",
  description: "Single image with caption",
  icon: Image,
  keywords: ["image", "picture", "photo", "graphic"],
  renderer: ImageRenderer,
  preview: ImagePreview,
  defaultContent: DEFAULT_MEDIA_CONTENT.image,
});
