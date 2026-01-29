import type {
  BlockContent,
  BlockType,
  CalloutContent,
  CodeContent,
  DividerContent,
  FileContent,
  HeadingContent,
  ImageContent,
  ParagraphContent,
  QuicklinksContent,
  SaveStatus,
} from "@/types";
/**
 * Block component prop types
 */
import type { ComponentType } from "react";

// Generic block data structure
export interface BlockData {
  _id: string;
  type: BlockType;
  content: BlockContent;
}

// Block editor props
export interface BlockEditorBaseProps {
  block: BlockData;
  onUpdate: (content: BlockContent) => Promise<unknown> | void;
  onRemove?: () => Promise<unknown> | void;
  onSaveStatusChange?: (status: SaveStatus) => void;
}

// Specific editor props
export interface HeadingEditorProps extends BlockEditorBaseProps {
  block: BlockData & { content: HeadingContent };
}

export interface ParagraphEditorProps extends BlockEditorBaseProps {
  block: BlockData & { content: ParagraphContent };
}

export interface CalloutEditorProps extends BlockEditorBaseProps {
  block: BlockData & { content: CalloutContent };
}

export interface CodeEditorProps extends BlockEditorBaseProps {
  block: BlockData & { content: CodeContent };
}

export interface DividerEditorProps extends BlockEditorBaseProps {
  block: BlockData & { content: DividerContent };
}

// Block renderer props
export interface BlockRendererBaseProps {
  block: BlockData;
}

// Specific renderer props
export interface HeadingRendererProps extends BlockRendererBaseProps {
  block: BlockData & { content: HeadingContent };
}

export interface ParagraphRendererProps extends BlockRendererBaseProps {
  block: BlockData & { content: ParagraphContent };
}

export interface CalloutRendererProps extends BlockRendererBaseProps {
  block: BlockData & { content: CalloutContent };
}

export interface CodeRendererProps extends BlockRendererBaseProps {
  block: BlockData & { content: CodeContent };
}

export interface DividerRendererProps extends BlockRendererBaseProps {
  block: BlockData & { content: DividerContent };
}

export interface ImageRendererProps extends BlockRendererBaseProps {
  block: BlockData & { content: ImageContent };
}

export interface FileRendererProps extends BlockRendererBaseProps {
  block: BlockData & { content: FileContent };
}

export interface QuicklinksEditorProps extends BlockEditorBaseProps {
  block: BlockData & { content: QuicklinksContent };
}

export interface QuicklinksRendererProps extends BlockRendererBaseProps {
  block: BlockData & { content: QuicklinksContent };
}

// Registry entry
export interface BlockRegistryEntry {
  type: BlockType;
  label: string;
  icon?: string;
  editor?: ComponentType<BlockEditorBaseProps>;
  renderer?: ComponentType<BlockRendererBaseProps>;
}
