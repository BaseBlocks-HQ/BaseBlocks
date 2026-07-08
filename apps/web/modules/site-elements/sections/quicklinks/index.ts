/**
 * Quicklinks section element
 * Grid of linked cards with images
 */

import { DEFAULT_SECTION_CONTENT } from "@baseblocks/domain/elements";
import { LayoutGrid } from "lucide-react";
import { registerElement } from "../../authoring/registry";
import { themedPickerImagePreview } from "../../authoring/themed-picker-image";
import { QuicklinksEditor } from "./editor";
import { QuicklinksRenderer } from "./renderer";

const preview = themedPickerImagePreview(
  "/editor/picker/blocks/quicklinks-light.png",
  "/editor/picker/blocks/quicklinks-dark.png",
);

export { QuicklinksEditor, QuicklinksRenderer };

registerElement({
  type: "quicklinks",
  category: "blocks",
  label: "Quick Links",
  description: "Grid of linked cards",
  icon: LayoutGrid,
  keywords: ["links", "cards", "grid", "shortcuts", "bookmarks"],
  editor: QuicklinksEditor,
  renderer: QuicklinksRenderer,
  preview,
  defaultContent: DEFAULT_SECTION_CONTENT.quicklinks,
});
