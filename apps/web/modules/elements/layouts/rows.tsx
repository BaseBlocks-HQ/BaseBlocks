import { Rows3 } from "lucide-react";
import { registerLayout } from "../framework/registry";
import { themedPickerImagePreview } from "../framework/themed-picker-image";

const RowsPreview = themedPickerImagePreview(
  "/editor/picker/layouts/rows-light.png",
  "/editor/picker/layouts/rows-dark.png",
);

registerLayout({
  type: "rows",
  category: "layouts",
  label: "Rows",
  description: "Vertical stack of rows",
  icon: Rows3,
  keywords: ["rows", "vertical", "stack"],
  preview: RowsPreview,
});
