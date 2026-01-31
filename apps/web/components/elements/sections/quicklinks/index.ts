/**
 * Quicklinks section element
 * Grid of linked cards with images
 */

import { LayoutGrid } from "lucide-react";
import { registerElement } from "../../registry";
import { DEFAULT_SECTION_CONTENT } from "@/types/elements";
import { QuicklinksPreview } from "./quicklinks-preview";

// Re-export existing components
export { QuicklinksEditor } from "@/components/blocks/editor/quicklinks-editor";
export { QuicklinksRenderer } from "@/components/blocks/renderer/quicklinks-renderer";
export { QuicklinksPreview } from "./quicklinks-preview";

// Register the element
registerElement({
  type: "quicklinks",
  category: "sections",
  label: "Quick Links",
  description: "Grid of linked cards",
  icon: LayoutGrid,
  keywords: ["links", "cards", "grid", "shortcuts", "bookmarks"],
  preview: QuicklinksPreview,
  defaultContent: DEFAULT_SECTION_CONTENT.quicklinks,
});
