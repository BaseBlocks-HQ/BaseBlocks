import {
  Columns3,
  LayoutGrid,
  MoveVertical,
  PanelRight,
  Rows3,
  Square,
} from "lucide-react";
import { registerLayout } from "../authoring/registry";
import { themedPickerImagePreview } from "../authoring/themed-picker-image";

const pickerPreview = (name: string) =>
  themedPickerImagePreview(
    `/editor/picker/layouts/${name}-light.png`,
    `/editor/picker/layouts/${name}-dark.png`,
  );

const pickerPreviewV2 = (name: string) =>
  themedPickerImagePreview(
    `/editor/picker/layouts/${name}-light-v2.png`,
    `/editor/picker/layouts/${name}-dark-v2.png`,
  );

registerLayout({
  type: "single",
  category: "layouts",
  label: "Single",
  description: "Full-width single column",
  icon: Square,
  keywords: ["single", "full", "one", "column"],
  preview: pickerPreviewV2("single"),
});

registerLayout({
  type: "columns",
  category: "layouts",
  label: "Columns",
  description: "Horizontal columns",
  icon: Columns3,
  keywords: ["columns", "horizontal", "side"],
  preview: pickerPreview("columns"),
});

registerLayout({
  type: "rows",
  category: "layouts",
  label: "Rows",
  description: "Vertical stack of rows",
  icon: Rows3,
  keywords: ["rows", "vertical", "stack"],
  preview: pickerPreview("rows"),
});

registerLayout({
  type: "grid",
  category: "layouts",
  label: "Grid",
  description: "Grid layout",
  icon: LayoutGrid,
  keywords: ["grid", "matrix", "cells"],
  preview: pickerPreview("grid"),
});

registerLayout({
  type: "vertical",
  category: "layouts",
  label: "Sidebar",
  description: "Sidebar beside main content",
  icon: PanelRight,
  keywords: ["sidebar", "vertical", "panel", "aside"],
  preview: pickerPreview("vertical"),
});

registerLayout({
  type: "spacer",
  category: "layouts",
  label: "Spacer",
  description: "Vertical spacing",
  icon: MoveVertical,
  keywords: ["spacer", "gap", "space", "vertical"],
  preview: pickerPreview("spacer"),
});
