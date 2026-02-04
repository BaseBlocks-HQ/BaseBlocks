/**
 * Banner block element
 * Announcement banner with alerts, importance presets, and carousel cycling
 */

import { DEFAULT_BLOCK_CONTENT } from "@/types/elements";
import { Megaphone } from "lucide-react";
import { registerElement } from "../../registry";
import { BannerConfigPanel } from "./banner-config";
import { BannerEditor } from "./banner-editor";
import { BannerPreview } from "./banner-preview";
import { BannerRenderer } from "./banner-renderer";

// Re-export components
export { BannerEditor, BannerRenderer, BannerPreview, BannerConfigPanel };

// Register the element
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
