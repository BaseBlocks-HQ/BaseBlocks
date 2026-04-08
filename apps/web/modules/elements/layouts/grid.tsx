import { LayoutGrid } from "lucide-react";
import { registerLayout } from "../framework/registry";
import { themedPickerImagePreview } from "../framework/themed-picker-image";

const GridPreview = themedPickerImagePreview(
  "/editor/picker/layouts/grid-light.png",
  "/editor/picker/layouts/grid-dark.png",
);

registerLayout({
  type: "grid",
  category: "layouts",
  label: "Grid",
  description: "Grid layout",
  icon: LayoutGrid,
  keywords: ["grid", "matrix", "cells"],
  preview: GridPreview,
});
