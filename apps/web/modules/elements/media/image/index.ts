/**
 * Image media element
 * Single image with caption support
 */

import { DEFAULT_MEDIA_CONTENT } from "@baseblocks/types/elements";
import { Image } from "lucide-react";
import { registerElement } from "../../framework/registry";
import { ImageEditor } from "./editor";
import { ImagePreview } from "./preview";
import { ImageRenderer } from "./renderer";

export { ImageEditor, ImageRenderer, ImagePreview };

registerElement({
  type: "image",
  category: "blocks",
  label: "Image",
  description: "Single image with caption",
  icon: Image,
  keywords: ["image", "picture", "photo", "graphic"],
  editor: ImageEditor,
  renderer: ImageRenderer,
  preview: ImagePreview,
  defaultContent: DEFAULT_MEDIA_CONTENT.image,
});
