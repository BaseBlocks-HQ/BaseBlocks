/**
 * Grid layout element
 * N×M grid
 */

import { LayoutGrid } from "lucide-react";
import { registerLayout } from "../../registry";
import { GridPreview } from "./grid-preview";

// Export preview component
export { GridPreview } from "./grid-preview";

// Register the layout
registerLayout({
  type: "grid",
  category: "layouts",
  label: "Grid",
  description: "Grid layout",
  icon: LayoutGrid,
  keywords: ["grid", "matrix", "cells"],
  preview: GridPreview,
});
