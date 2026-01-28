/**
 * Block system - registers all blocks and exports components
 */
import { registerBlock } from "./registry";

// Import editors
import { HeadingEditor } from "./editor/heading-editor";
import { ParagraphEditor } from "./editor/paragraph-editor";
import { DividerEditor } from "./editor/divider-editor";
import { CalloutEditor } from "./editor/callout-editor";
import { CodeEditor } from "./editor/code-editor";

// Import renderers
import { HeadingRenderer } from "./renderer/heading-renderer";
import { ParagraphRenderer } from "./renderer/paragraph-renderer";
import { DividerRenderer } from "./renderer/divider-renderer";
import { CalloutRenderer } from "./renderer/callout-renderer";
import { CodeRenderer } from "./renderer/code-renderer";
import { ImageRenderer } from "./renderer/image-renderer";
import { FileRenderer } from "./renderer/file-renderer";

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
  CalloutEditor,
  CodeEditor,
} from "./editor";

// Export individual renderers
export {
  HeadingRenderer,
  ParagraphRenderer,
  DividerRenderer,
  CalloutRenderer,
  CodeRenderer,
  ImageRenderer,
  FileRenderer,
} from "./renderer";

// Export types
export type {
  BlockData,
  BlockEditorBaseProps,
  BlockRendererBaseProps,
  BlockRegistryEntry,
} from "./types";
