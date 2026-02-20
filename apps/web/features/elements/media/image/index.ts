/**
 * Image media element
 * Single image with caption support
 */

import { DEFAULT_MEDIA_CONTENT } from "@baseblocks/types/elements";
import { Image } from "lucide-react";
import { registerElement } from "../../registry";
import { ImageEditor } from "./image-editor";
import { ImagePreview } from "./image-preview";
import { ImageRenderer } from "./image-renderer";

// Re-export components
export { ImageEditor, ImageRenderer, ImagePreview };

// Register the element
registerElement({
  type: "image",
  category: "media",
  label: "Image",
  description: "Single image with caption",
  icon: Image,
  keywords: ["image", "picture", "photo", "graphic"],
  editor: ImageEditor,
  renderer: ImageRenderer,
  preview: ImagePreview,
  defaultContent: DEFAULT_MEDIA_CONTENT.image,
});
