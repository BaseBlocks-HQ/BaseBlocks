import type { OpenEditorViewerRenderer } from "@openeditor/react";
import { DecisionTreeViewer, readDecisionTree } from "./decision-tree";
import { DirectoryViewer, readDirectory } from "./directory";
import { PublicLibraryViewer, readLibrary } from "./library";
import { QuickLinksViewer, readQuickLinks } from "./quick-links";
import { SearchViewer, readSearch } from "./search";

export const publicSiteRenderers = {
  baseblocksDecisionTree: ({ node }) => (
    <DecisionTreeViewer value={readDecisionTree(node.attrs?.decisionTree)} />
  ),
  baseblocksDirectory: ({ node }) => (
    <DirectoryViewer value={readDirectory(node.attrs?.directory)} />
  ),
  baseblocksLibrary: ({ node }) => (
    <PublicLibraryViewer value={readLibrary(node.attrs?.library)} />
  ),
  baseblocksQuickLinks: ({ node }) => (
    <QuickLinksViewer links={readQuickLinks(node.attrs?.links)} />
  ),
  baseblocksSearch: ({ node }) => (
    <SearchViewer value={readSearch(node.attrs?.search)} />
  ),
} satisfies Record<string, OpenEditorViewerRenderer>;
