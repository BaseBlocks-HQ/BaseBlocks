/**
 * Image media element
 * Single image with caption support
 */

import { DEFAULT_MEDIA_CONTENT } from "@baseblocks/domain/elements";
import { Image } from "lucide-react";
import { registerElement } from "../../authoring/registry";
import { themedPickerImagePreview } from "../../authoring/themed-picker-image";
import { ImageEditor } from "./editor";
import { ImageRenderer } from "./renderer";

const preview = themedPickerImagePreview(
  "/editor/picker/blocks/image-light.png",
  "/editor/picker/blocks/image-dark.png",
);

export { ImageEditor, ImageRenderer };

registerElement({
  type: "image",
  category: "blocks",
  label: "Image",
  description: "Single image with caption",
  icon: Image,
  keywords: ["image", "picture", "photo", "graphic"],
  editor: ImageEditor,
  renderer: ImageRenderer,
  preview,
  defaultContent: DEFAULT_MEDIA_CONTENT.image,
});
