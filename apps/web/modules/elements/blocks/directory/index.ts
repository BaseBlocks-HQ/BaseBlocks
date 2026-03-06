/**
 * Directory block element
 * Configurable data table with columns, rows, and inline cell data
 */

import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/types/elements";
import { TableIcon } from "lucide-react";
import { registerElement } from "../../framework/registry";
import { DirectoryConfigPanel } from "./config";
import { DirectoryEditor } from "./editor";
import { DirectoryPreview } from "./preview";
import { DirectoryRenderer } from "./renderer";

registerElement({
  type: "directory",
  category: "blocks",
  label: "Directory",
  description: "Configurable data table with search and pagination",
  icon: TableIcon,
  keywords: ["directory", "table", "data", "list", "grid", "spreadsheet"],
  editor: DirectoryEditor,
  renderer: DirectoryRenderer,
  preview: DirectoryPreview,
  configPanel: DirectoryConfigPanel,
  defaultContent: DEFAULT_BLOCK_CONTENT.directory,
});
