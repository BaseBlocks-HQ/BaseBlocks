/**
 * Banner block element
 * Announcement banner with alerts, importance presets, and carousel cycling
 */

import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/types/elements";
import { Megaphone } from "lucide-react";
import { registerElement } from "../../framework/registry";
import { BannerConfigPanel } from "./config";
import { BannerEditor } from "./editor";
import { BannerPreview } from "./preview";
import { BannerRenderer } from "./renderer";

export { BannerEditor, BannerRenderer, BannerPreview, BannerConfigPanel };

registerElement({
  type: "banner",
  category: "blocks",
  label: "Banner",
  description: "Announcement banner with alerts",
  icon: Megaphone,
  keywords: ["banner", "announcement", "alert", "notification", "notice"],
  editor: BannerEditor,
  renderer: BannerRenderer,
  preview: BannerPreview,
  configPanel: BannerConfigPanel,
  defaultContent: DEFAULT_BLOCK_CONTENT.banner,
});
