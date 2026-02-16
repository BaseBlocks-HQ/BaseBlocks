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
  | "banner"
  | "directory"
  | "flowchart"
  | "decision-tree";

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
  mermaidCode?: string;
  diagrams?: FlowchartDiagram[];
  /** beautiful-mermaid theme preset key (e.g. "tokyo-night", "dracula"). */
  diagramTheme?: string;
  /** How to display diagram tabs when multiple diagrams exist. */
  diagramTabsMode?: TabsDisplayMode;
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

// Directory block types
export type DirectoryColumnType = "text" | "email" | "phone" | "url";

export interface DirectoryColumn {
  id: string;
  header: string;
  type?: DirectoryColumnType;
}

export interface DirectoryRow {
  id: string;
  cells: Record<string, string>; // columnId → cell value
}

export interface DirectorySettings {
  copyMode: "none" | "cell" | "row";
  pageSize: number;
  showSearch: boolean;
}

export interface DirectoryContent {
  columns: DirectoryColumn[];
  rows: DirectoryRow[];
  settings: DirectorySettings;
}

export interface FlowchartDiagram {
  id: string;
  label: string;
  mermaidCode: string;
}

export type TabsDisplayMode = "row" | "dropdown";

export interface FlowchartContent {
  mermaidCode: string;
  diagrams?: FlowchartDiagram[];
  /** beautiful-mermaid theme preset key (e.g. "tokyo-night", "dracula"). Unset = auto light/dark. */
  theme?: string;
  /** How to display diagram tabs when multiple diagrams exist. */
  tabsMode?: TabsDisplayMode;
}

// Decision tree block types
// Allowed block types inside decision tree nodes (subset of BaseBlocks block types)
export type DecisionTreeBlockType = "heading" | "paragraph" | "callout" | "code" | "divider";

export interface DecisionTreeContentBlock {
  id: string;
  type: DecisionTreeBlockType;
  // Uses the same content shapes as BaseBlocks blocks (HeadingContent, ParagraphContent, etc.)
  // biome-ignore lint/suspicious/noExplicitAny: Content varies by block type, matching BaseBlocks layout pattern
  content: any;
  order: number;
}

export interface DecisionTreeNode {
  id: string;
  parentId: string | null;
  name: string;
  order: number;
  contentBlocks: DecisionTreeContentBlock[];
}

export interface DecisionTree {
  id: string;
  label: string;
  nodes: DecisionTreeNode[];
}

export interface DecisionTreeContent {
  nodes: DecisionTreeNode[];
  trees?: DecisionTree[];
  /** How to display tree tabs when multiple trees exist. */
  tabsMode?: TabsDisplayMode;
}

// Union of all block content types
export type BlockContentUnion =
  | HeadingContent
  | ParagraphContent
  | CalloutContent
  | CodeContent
  | DividerContent
  | BlockSpacerContent
  | SubpageContent
  | BannerContent
  | DirectoryContent
  | FlowchartContent
  | DecisionTreeContent;

// Default content for new blocks
export const DEFAULT_BLOCK_CONTENT: Record<BlockType, BlockContentUnion> = {
  heading: { text: "", level: 2 },
  paragraph: { text: "" },
  callout: { text: "", variant: "info" },
  code: { text: "", language: "typescript" },
  divider: {},
  "block-spacer": { height: "medium" },
  subpage: { title: "", description: "", content: undefined, diagramTabsMode: "row" },
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
  directory: {
    columns: [],
    rows: [],
    settings: {
      copyMode: "none",
      pageSize: 10,
      showSearch: true,
    },
  } as DirectoryContent,
  flowchart: { mermaidCode: "", tabsMode: "row" } as FlowchartContent,
  "decision-tree": { nodes: [], tabsMode: "row" } as DecisionTreeContent,
};
