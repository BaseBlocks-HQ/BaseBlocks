import { Columns3 } from "lucide-react";
import { registerLayout } from "../framework/registry";
import { themedPickerImagePreview } from "../framework/themed-picker-image";

const ColumnsPreview = themedPickerImagePreview(
  "/editor/picker/layouts/columns-light.png",
  "/editor/picker/layouts/columns-dark.png",
);

registerLayout({
  type: "columns",
  category: "layouts",
  label: "Columns",
  description: "Horizontal columns",
  icon: Columns3,
  keywords: ["columns", "horizontal", "side"],
  preview: ColumnsPreview,
});
