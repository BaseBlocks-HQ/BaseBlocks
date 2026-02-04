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
  | "block-spacer" // Renamed from "spacer" to avoid confusion with layout spacer
  | "subpage"
  | "banner";

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

// BlockNote block type - using unknown[] since BlockNote manages its own schema
export type BlockNoteDocument = unknown[];

export interface SubpageContent {
  title: string;
  description?: string;
  content?: BlockNoteDocument;
}

export interface BannerAlert {
  id: string;
  title: string;
  description: string;
  importance: string; // references preset id
}

export interface BannerImportancePreset {
  id: string;
  name: string;
  color: string; // bg hex color
  foreground: string; // text hex color
}

export interface BannerSettings {
  dismissible: boolean;
  autoCycle: boolean;
  cycleIntervalMs: number;
  scope: "this-page" | "site-wide" | "specific-pages";
  targetPageIds: string[];
}

export interface BannerContent {
  alerts: BannerAlert[];
  importancePresets: BannerImportancePreset[];
  settings: BannerSettings;
}

export const DEFAULT_IMPORTANCE_PRESETS: BannerImportancePreset[] = [
  { id: "critical", name: "Critical", color: "#DC2626", foreground: "#FFFFFF" },
  { id: "warning", name: "Warning", color: "#D97706", foreground: "#FFFFFF" },
  { id: "info", name: "Info", color: "#2563EB", foreground: "#FFFFFF" },
];

// Union of all block content types
export type BlockContentUnion =
  | HeadingContent
  | ParagraphContent
  | CalloutContent
  | CodeContent
  | DividerContent
  | BlockSpacerContent
  | SubpageContent
  | BannerContent;

// Default content for new blocks
export const DEFAULT_BLOCK_CONTENT: Record<BlockType, BlockContentUnion> = {
  heading: { text: "", level: 2 },
  paragraph: { text: "" },
  callout: { text: "", variant: "info" },
  code: { text: "", language: "typescript" },
  divider: {},
  "block-spacer": { height: "medium" },
  subpage: { title: "", description: "", content: undefined },
  banner: {
    alerts: [],
    importancePresets: DEFAULT_IMPORTANCE_PRESETS,
    settings: {
      dismissible: true,
      autoCycle: true,
      cycleIntervalMs: 5000,
      scope: "this-page",
      targetPageIds: [],
    },
  } as BannerContent,
};
