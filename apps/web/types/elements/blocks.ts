/**
 * Block element types and content definitions
 * Blocks are basic content primitives (text, code, dividers, etc.)
 */

// Block element types (content primitives only)
export type BlockType =
  | "heading"
  | "paragraph"
  | "callout"
  | "code"
  | "divider"
  | "block-spacer"; // Renamed from "spacer" to avoid confusion with layout spacer

// Block content interfaces
export interface HeadingContent {
  text: string;
  level?: 1 | 2 | 3 | 4 | 5;
}

export interface ParagraphContent {
  text: string;
}

export interface CalloutContent {
  text: string;
  variant?: "info" | "warning" | "error" | "success";
}

export interface CodeContent {
  text: string;
  language?: string;
}

export type DividerContent = Record<string, never>;

export interface BlockSpacerContent {
  height: "small" | "medium" | "large" | "xlarge";
}

// Union of all block content types
export type BlockContentUnion =
  | HeadingContent
  | ParagraphContent
  | CalloutContent
  | CodeContent
  | DividerContent
  | BlockSpacerContent;

// Default content for new blocks
export const DEFAULT_BLOCK_CONTENT: Record<BlockType, BlockContentUnion> = {
  heading: { text: "New Heading", level: 2 },
  paragraph: { text: "" },
  callout: { text: "", variant: "info" },
  code: { text: "", language: "typescript" },
  divider: {},
  "block-spacer": { height: "medium" },
};
