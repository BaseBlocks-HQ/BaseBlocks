/**
 * Hero section element (stub)
 * Full-width hero section with title, subtitle, and CTA
 */

import { LayoutTemplate } from "lucide-react";
import { registerElement } from "../../registry";
import { DEFAULT_SECTION_CONTENT } from "@/types/elements";
import { HeroPreview } from "./hero-preview";

// Export preview component
export { HeroPreview } from "./hero-preview";

// Register the element (no editor/renderer yet - stub)
registerElement({
  type: "hero",
  category: "sections",
  label: "Hero",
  description: "Full-width hero section",
  icon: LayoutTemplate,
  keywords: ["hero", "banner", "header", "title", "cta"],
  preview: HeroPreview,
  defaultContent: DEFAULT_SECTION_CONTENT.hero,
});
