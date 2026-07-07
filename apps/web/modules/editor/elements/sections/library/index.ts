/**
 * Library section element
 * Document library with folder navigation
 */

import { DEFAULT_SECTION_CONTENT } from "@baseblocks/domain/elements";
import { Library } from "lucide-react";
import { registerElement } from "../../framework/registry";
import { themedPickerImagePreview } from "../../framework/themed-picker-image";
import { LibraryConfigPanel } from "./config";
import { LibraryEditor } from "./editor";
import { LibraryRenderer } from "./renderer";

const preview = themedPickerImagePreview(
  "/editor/picker/blocks/library-light.png",
  "/editor/picker/blocks/library-dark.png",
);

export { LibraryEditor, LibraryRenderer, LibraryConfigPanel };

registerElement({
  type: "library",
  category: "blocks",
  label: "Library",
  description: "Document library with folders",
  icon: Library,
  keywords: ["library", "documents", "files", "folder", "storage"],
  editor: LibraryEditor,
  renderer: LibraryRenderer,
  preview,
  configPanel: LibraryConfigPanel,
  defaultContent: DEFAULT_SECTION_CONTENT.library,
});
