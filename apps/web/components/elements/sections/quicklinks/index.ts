/**
 * Quicklinks section element
 * Grid of linked cards with images
 */

import { LayoutGrid } from "lucide-react";
import { registerElement } from "../../registry";
import { DEFAULT_SECTION_CONTENT } from "@/types/elements";
import { QuicklinksPreview } from "./quicklinks-preview";
import { QuicklinksEditor } from "./quicklinks-editor";
import { QuicklinksRenderer } from "./quicklinks-renderer";

// Re-export components
export { QuicklinksEditor, QuicklinksRenderer, QuicklinksPreview };

// Register the element
registerElement({
  type: "quicklinks",
  category: "sections",
  label: "Quick Links",
  description: "Grid of linked cards",
  icon: LayoutGrid,
  keywords: ["links", "cards", "grid", "shortcuts", "bookmarks"],
  editor: QuicklinksEditor,
  renderer: QuicklinksRenderer,
  preview: QuicklinksPreview,
  defaultContent: DEFAULT_SECTION_CONTENT.quicklinks,
});
