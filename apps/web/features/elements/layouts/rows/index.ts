/**
 * Rows layout element
 * Vertical stack of rows
 */

import { Rows3 } from "lucide-react";
import { registerLayout } from "../../registry";
import { RowsPreview } from "./rows-preview";

// Export preview component
export { RowsPreview } from "./rows-preview";

// Register the layout
registerLayout({
  type: "rows",
  category: "layouts",
  label: "Rows",
  description: "Vertical stack of rows",
  icon: Rows3,
  keywords: ["rows", "vertical", "stack"],
  preview: RowsPreview,
});
