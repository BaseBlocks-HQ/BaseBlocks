/**
 * Directory block element
 * Configurable data table with columns, rows, and inline cell data
 */

import { DEFAULT_BLOCK_CONTENT } from "@repo/types/elements";
import { TableIcon } from "lucide-react";
import { registerElement } from "../../registry";
import { DirectoryConfigPanel } from "./directory-config";
import { DirectoryEditor } from "./directory-editor";
import { DirectoryPreview } from "./directory-preview";
import { DirectoryRenderer } from "./directory-renderer";

// Re-export components
export {
  DirectoryEditor,
  DirectoryRenderer,
  DirectoryPreview,
  DirectoryConfigPanel,
};

// Register the element
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
