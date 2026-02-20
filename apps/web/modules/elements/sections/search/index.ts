/**
 * Search section element
 * Document search functionality
 */

import { DEFAULT_SECTION_CONTENT } from "@baseblocks/types/elements";
import { Search } from "lucide-react";
import { registerElement } from "../../registry";
import { SearchConfigPanel } from "./config";
import { SearchEditor } from "./editor";
import { SearchPreview } from "./preview";
import { SearchRenderer } from "./renderer";

// Re-export components
export { SearchEditor, SearchRenderer, SearchPreview, SearchConfigPanel };

// Register the element
registerElement({
  type: "search",
  category: "sections",
  label: "Search",
  description: "Document search with filters",
  icon: Search,
  keywords: ["search", "find", "query", "lookup", "filter"],
  editor: SearchEditor,
  renderer: SearchRenderer,
  preview: SearchPreview,
  configPanel: SearchConfigPanel,
  defaultContent: DEFAULT_SECTION_CONTENT.search,
});
