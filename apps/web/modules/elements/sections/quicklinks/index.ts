/**
 * Quicklinks section element
 * Grid of linked cards with images
 */

import { DEFAULT_SECTION_CONTENT } from "@baseblocks/types/elements";
import { LayoutGrid } from "lucide-react";
import { registerElement } from "../../framework/registry";
import { QuicklinksEditor } from "./editor";
import { QuicklinksPreview } from "./preview";
import { QuicklinksRenderer } from "./renderer";

export { QuicklinksEditor, QuicklinksRenderer, QuicklinksPreview };

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
