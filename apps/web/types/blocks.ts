/**
 * Block type definitions for the editor and renderer
 */
import type { Block, BlockId } from "./convex";

// Block type union (matches Convex schema)
export type BlockType =
  | "heading"
  | "paragraph"
  | "image"
  | "file"
  | "document-list"
  | "embed"
  | "divider"
  | "callout"
  | "code"
  | "table";

// Block content interfaces
export interface HeadingContent {
  text: string;
  level?: 1 | 2 | 3 | 4 | 5;
}

export interface ParagraphContent {
  text: string;
}

export interface ImageContent {
  url: string;
  alt?: string;
  caption?: string;
}

export interface FileContent {
  url: string;
  filename: string;
  size?: number;
}

export interface DividerContent {
  // Empty - dividers have no content
}

export interface CalloutContent {
  text: string;
  variant?: "info" | "warning" | "error" | "success";
}

export interface CodeContent {
  text: string;
  language?: string;
}

export interface EmbedContent {
  url: string;
  type?: "youtube" | "vimeo" | "generic";
}

export interface TableContent {
  rows: string[][];
  headers?: string[];
}

// Union of all content types
export type BlockContent =
  | HeadingContent
  | ParagraphContent
  | ImageContent
  | FileContent
  | DividerContent
  | CalloutContent
  | CodeContent
  | EmbedContent
  | TableContent;

// Block with typed content
export interface TypedBlock<T extends BlockType = BlockType> {
  _id: string;
  pageId: string;
  type: T;
  order: number;
  content: T extends "heading"
    ? HeadingContent
    : T extends "paragraph"
      ? ParagraphContent
      : T extends "image"
        ? ImageContent
        : T extends "file"
          ? FileContent
          : T extends "divider"
            ? DividerContent
            : T extends "callout"
              ? CalloutContent
              : T extends "code"
                ? CodeContent
                : T extends "embed"
                  ? EmbedContent
                  : T extends "table"
                    ? TableContent
                    : BlockContent;
  createdAt: number;
  updatedAt: number;
}

// Block editor component props
export interface BlockEditorProps<T extends BlockType = BlockType> {
  block: TypedBlock<T>;
  onUpdate: (content: BlockContent) => Promise<void> | void;
  onRemove: () => void;
  onSaveStatusChange?: (status: SaveStatus) => void;
}

// Block renderer component props
export interface BlockRendererProps<T extends BlockType = BlockType> {
  block: TypedBlock<T>;
}

// Save status state machine
export type SaveStatus = "idle" | "pending" | "saving" | "saved";

// Default content for new blocks
export const DEFAULT_BLOCK_CONTENT: Record<BlockType, BlockContent> = {
  heading: { text: "New Heading", level: 2 },
  paragraph: { text: "" },
  image: { url: "" },
  file: { url: "", filename: "" },
  "document-list": {},
  embed: { url: "" },
  divider: {},
  callout: { text: "", variant: "info" },
  code: { text: "", language: "typescript" },
  table: { rows: [[]], headers: [] },
};
