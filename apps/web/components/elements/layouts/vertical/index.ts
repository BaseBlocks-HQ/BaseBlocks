/**
 * Vertical (Sidebar) layout element
 * Sidebar beside main content
 */

import { PanelRight } from "lucide-react";
import { registerLayout } from "../../registry";
import { VerticalPreview } from "./vertical-preview";

// Export preview component
export { VerticalPreview } from "./vertical-preview";

// Register the layout
registerLayout({
  type: "vertical",
  category: "layouts",
  label: "Sidebar",
  description: "Sidebar beside main content",
  icon: PanelRight,
  keywords: ["sidebar", "vertical", "panel", "aside"],
  preview: VerticalPreview,
});
