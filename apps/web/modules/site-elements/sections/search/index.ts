/**
 * Search section element
 * Document search functionality
 */

import { DEFAULT_SECTION_CONTENT } from "@baseblocks/domain/elements";
import { Search } from "lucide-react";
import { registerElement } from "../../authoring/registry";
import { themedPickerImagePreview } from "../../authoring/themed-picker-image";
import { SearchConfigPanel } from "./config";
import { SearchEditor } from "./editor";
import { SearchRenderer } from "./renderer";

const preview = themedPickerImagePreview(
  "/editor/picker/blocks/search-light.png",
  "/editor/picker/blocks/search-dark.png",
);

export { SearchEditor, SearchRenderer, SearchConfigPanel };

registerElement({
  type: "search",
  category: "blocks",
  label: "Search",
  description: "Document search with filters",
  icon: Search,
  keywords: ["search", "find", "query", "lookup", "filter"],
  editor: SearchEditor,
  renderer: SearchRenderer,
  preview,
  configPanel: SearchConfigPanel,
  defaultContent: DEFAULT_SECTION_CONTENT.search,
});
