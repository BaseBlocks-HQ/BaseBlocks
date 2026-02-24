/**
 * Library section element
 * Document library with folder navigation
 */

import { DEFAULT_SECTION_CONTENT } from "@baseblocks/types/elements";
import { Library } from "lucide-react";
import { registerElement } from "../../framework/registry";
import { LibraryConfigPanel } from "./config";
import { LibraryEditor } from "./editor";
import { LibraryPreview } from "./preview";
import { LibraryRenderer } from "./renderer";

export { LibraryEditor, LibraryRenderer, LibraryPreview, LibraryConfigPanel };

registerElement({
  type: "library",
  category: "sections",
  label: "Library",
  description: "Document library with folders",
  icon: Library,
  keywords: ["library", "documents", "files", "folder", "storage"],
  editor: LibraryEditor,
  renderer: LibraryRenderer,
  preview: LibraryPreview,
  configPanel: LibraryConfigPanel,
  defaultContent: DEFAULT_SECTION_CONTENT.library,
});
