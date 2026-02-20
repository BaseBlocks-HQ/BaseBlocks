/**
 * Columns layout element
 * Horizontal columns
 */

import { Columns3 } from "lucide-react";
import { registerLayout } from "../../registry";
import { ColumnsPreview } from "./columns-preview";

// Export preview component
export { ColumnsPreview } from "./columns-preview";

// Register the layout
registerLayout({
  type: "columns",
  category: "layouts",
  label: "Columns",
  description: "Horizontal columns",
  icon: Columns3,
  keywords: ["columns", "horizontal", "side"],
  preview: ColumnsPreview,
});
