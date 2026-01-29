/**
 * Block system - registers all blocks and exports components
 */
import { registerBlock } from "./registry";

import { CalloutEditor } from "./editor/callout-editor";
import { CodeEditor } from "./editor/code-editor";
import { DividerEditor } from "./editor/divider-editor";
import { LibraryEditor } from "./editor/library-editor";
// Import editors
import { HeadingEditor } from "./editor/heading-editor";
import { ParagraphEditor } from "./editor/paragraph-editor";
import { QuicklinksEditor } from "./editor/quicklinks-editor";
import { SearchEditor } from "./editor/search-editor";
import { SpacerEditor } from "./editor/spacer-editor";

import { CalloutRenderer } from "./renderer/callout-renderer";
import { CodeRenderer } from "./renderer/code-renderer";
import { DividerRenderer } from "./renderer/divider-renderer";
import { LibraryRenderer } from "./renderer/library-renderer";
import { FileRenderer } from "./renderer/file-renderer";
// Import renderers
import { HeadingRenderer } from "./renderer/heading-renderer";
import { ImageRenderer } from "./renderer/image-renderer";
import { ParagraphRenderer } from "./renderer/paragraph-renderer";
import { QuicklinksRenderer } from "./renderer/quicklinks-renderer";
import { SearchRenderer } from "./renderer/search-renderer";
import { SpacerRenderer } from "./renderer/spacer-renderer";

// Register all blocks
registerBlock({
  type: "heading",
  label: "Heading",
  editor: HeadingEditor,
  renderer: HeadingRenderer,
});

registerBlock({
  type: "paragraph",
  label: "Paragraph",
  editor: ParagraphEditor,
  renderer: ParagraphRenderer,
});

registerBlock({
  type: "divider",
  label: "Divider",
  editor: DividerEditor,
  renderer: DividerRenderer,
});

registerBlock({
  type: "spacer",
  label: "Spacer",
  editor: SpacerEditor,
  renderer: SpacerRenderer,
});

registerBlock({
  type: "callout",
  label: "Callout",
  editor: CalloutEditor,
  renderer: CalloutRenderer,
});

registerBlock({
  type: "code",
  label: "Code",
  editor: CodeEditor,
  renderer: CodeRenderer,
});

registerBlock({
  type: "image",
  label: "Image",
  renderer: ImageRenderer,
});

registerBlock({
  type: "file",
  label: "File",
  renderer: FileRenderer,
});

registerBlock({
  type: "library",
  label: "Library",
  editor: LibraryEditor,
  renderer: LibraryRenderer,
});

registerBlock({
  type: "search",
  label: "Search",
  editor: SearchEditor,
  renderer: SearchRenderer,
});

registerBlock({
  type: "quicklinks",
  label: "Quicklinks",
  editor: QuicklinksEditor,
  renderer: QuicklinksRenderer,
});

// Export registry functions
export {
  registerBlock,
  getBlockEditor,
  getBlockRenderer,
  getBlockLabel,
  isBlockRegistered,
  getRegisteredBlockTypes,
  getAllBlockEntries,
} from "./registry";

// Export wrapper components
export { BlockEditorWrapper } from "./editor/block-editor-wrapper";
export { BlockRendererWrapper } from "./renderer/block-renderer-wrapper";

// Export individual editors
export {
  HeadingEditor,
  ParagraphEditor,
  DividerEditor,
  SpacerEditor,
  CalloutEditor,
  CodeEditor,
  LibraryEditor,
  SearchEditor,
  QuicklinksEditor,
} from "./editor";

// Export individual renderers
export {
  HeadingRenderer,
  ParagraphRenderer,
  DividerRenderer,
  SpacerRenderer,
  CalloutRenderer,
  CodeRenderer,
  ImageRenderer,
  FileRenderer,
  LibraryRenderer,
  SearchRenderer,
  QuicklinksRenderer,
} from "./renderer";

// Export types
export type {
  BlockData,
  BlockEditorBaseProps,
  BlockRendererBaseProps,
  BlockRegistryEntry,
} from "./types";
