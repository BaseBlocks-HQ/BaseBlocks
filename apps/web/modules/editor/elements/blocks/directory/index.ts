/**
 * Directory block element
 * Configurable data table with columns, rows, and inline cell data
 */

import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/domain/elements";
import { TableIcon } from "lucide-react";
import { registerElement } from "../../framework/registry";
import { themedPickerImagePreview } from "../../framework/themed-picker-image";
import { DirectoryConfigPanel } from "./config";
import { DirectoryEditor } from "./editor";
import { DirectoryRenderer } from "./renderer";

const preview = themedPickerImagePreview(
  "/editor/picker/blocks/directory-light.png",
  "/editor/picker/blocks/directory-dark.png",
);

registerElement({
  type: "directory",
  category: "blocks",
  label: "Directory",
  description: "Configurable data table with search and pagination",
  icon: TableIcon,
  keywords: ["directory", "table", "data", "list", "grid", "spreadsheet"],
  editor: DirectoryEditor,
  renderer: DirectoryRenderer,
  preview,
  configPanel: DirectoryConfigPanel,
  defaultContent: DEFAULT_BLOCK_CONTENT.directory,
});
