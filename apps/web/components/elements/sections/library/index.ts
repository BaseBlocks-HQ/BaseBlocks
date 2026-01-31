/**
 * Library section element
 * Document library with folder navigation
 */

import { DEFAULT_SECTION_CONTENT } from "@/types/elements";
import { Library } from "lucide-react";
import { registerElement } from "../../registry";
import { LibraryConfigPanel } from "./library-config";
import { LibraryEditor } from "./library-editor";
import { LibraryPreview } from "./library-preview";
import { LibraryRenderer } from "./library-renderer";

// Re-export components
export { LibraryEditor, LibraryRenderer, LibraryPreview, LibraryConfigPanel };

// Register the element
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
