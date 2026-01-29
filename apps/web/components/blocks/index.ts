/**
 * Block system - registers all blocks and exports components
 */
import { registerBlock } from "./registry";

// Import editors
import { HeadingEditor } from "./editor/heading-editor";
import { ParagraphEditor } from "./editor/paragraph-editor";
import { DividerEditor } from "./editor/divider-editor";
import { SpacerEditor } from "./editor/spacer-editor";
import { CalloutEditor } from "./editor/callout-editor";
import { CodeEditor } from "./editor/code-editor";
import { DocumentLibraryEditor } from "./editor/document-library-editor";
import { SearchEditor } from "./editor/search-editor";
import { QuicklinksEditor } from "./editor/quicklinks-editor";

// Import renderers
import { HeadingRenderer } from "./renderer/heading-renderer";
import { ParagraphRenderer } from "./renderer/paragraph-renderer";
import { DividerRenderer } from "./renderer/divider-renderer";
import { SpacerRenderer } from "./renderer/spacer-renderer";
import { CalloutRenderer } from "./renderer/callout-renderer";
import { CodeRenderer } from "./renderer/code-renderer";
import { ImageRenderer } from "./renderer/image-renderer";
import { FileRenderer } from "./renderer/file-renderer";
import { DocumentLibraryRenderer } from "./renderer/document-library-renderer";
import { SearchRenderer } from "./renderer/search-renderer";
import { QuicklinksRenderer } from "./renderer/quicklinks-renderer";

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
  type: "document-library",
  label: "Document Library",
  editor: DocumentLibraryEditor,
  renderer: DocumentLibraryRenderer,
});

registerBlock({
  type: "search",
  label: "Document Search",
  editor: SearchEditor,
  renderer: SearchRenderer,
});

registerBlock({
  type: "quicklinks",
  label: "Quick Links",
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
  DocumentLibraryEditor,
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
  DocumentLibraryRenderer,
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
