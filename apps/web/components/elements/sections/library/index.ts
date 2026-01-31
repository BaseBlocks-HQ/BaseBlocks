/**
 * Library section element
 * Document library with folder navigation
 */

import { Library } from "lucide-react";
import { registerElement } from "../../registry";
import { DEFAULT_SECTION_CONTENT } from "@/types/elements";
import { LibraryPreview } from "./library-preview";

// Re-export existing components
export { LibraryEditor } from "@/components/blocks/editor/library-editor";
export { LibraryRenderer } from "@/components/blocks/renderer/library-renderer";
export { LibraryPreview } from "./library-preview";

// Register the element
registerElement({
  type: "library",
  category: "sections",
  label: "Library",
  description: "Document library with folders",
  icon: Library,
  keywords: ["library", "documents", "files", "folder", "storage"],
  preview: LibraryPreview,
  defaultContent: DEFAULT_SECTION_CONTENT.library,
});
