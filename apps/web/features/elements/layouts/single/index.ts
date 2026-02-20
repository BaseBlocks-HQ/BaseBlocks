/**
 * Single layout element
 * Full-width single column container
 */

import { Square } from "lucide-react";
import { registerLayout } from "../../registry";
import { SinglePreview } from "./single-preview";

// Export preview component
export { SinglePreview } from "./single-preview";

// Register the layout
registerLayout({
  type: "single",
  category: "layouts",
  label: "Single",
  description: "Full-width single column",
  icon: Square,
  keywords: ["single", "full", "one", "column"],
  preview: SinglePreview,
});
