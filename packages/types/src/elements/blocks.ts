export type BlockType =
  | "heading"
  | "paragraph"
  | "callout"
  | "code"
  | "divider"
  | "block-spacer" // Renamed from "spacer" to avoid confusion with layout spacer
  | "file"
  | "richtext"
  | "page"
  | "directory"
  | "flowchart"
  | "decision-tree";

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

export interface FileContent {
  documentId?: string;
  filename?: string;
  contentType?: string;
  size?: number;
  createdAt?: number;
}

export type BlockNoteDocument = unknown[];

export interface RichTextContent {
  document: unknown[];
}

export interface PageBlockContent {
  pageId: string;
}

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

export type DecisionTreeBlockType =
  | "heading"
  | "paragraph"
  | "callout"
  | "code"
  | "divider";

export interface DecisionTreeContentBlock {
  id: string;
  type: DecisionTreeBlockType;
  // biome-ignore lint/suspicious/noExplicitAny: Content varies by block type, matching BaseBlocks layout pattern
  content: any;
  order: number;
}

export interface DecisionTreeNode {
  id: string;
  parentId: string | null;
  name: string;
  order: number;
  /** BlockNote document content (new format). */
  document?: unknown[];
  /** @deprecated Legacy block-based content. Use `document` instead. */
  contentBlocks?: DecisionTreeContentBlock[];
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

export type BlockContentUnion =
  | HeadingContent
  | ParagraphContent
  | CalloutContent
  | CodeContent
  | DividerContent
  | BlockSpacerContent
  | FileContent
  | RichTextContent
  | PageBlockContent
  | DirectoryContent
  | FlowchartContent
  | DecisionTreeContent;

export const DEFAULT_BLOCK_CONTENT: Record<BlockType, BlockContentUnion> = {
  heading: { text: "", level: 2 },
  paragraph: { text: "" },
  callout: { text: "", variant: "info" },
  code: { text: "", language: "typescript" },
  divider: {},
  "block-spacer": { height: "medium" },
  file: {},
  richtext: { document: [] } as RichTextContent,
  page: { pageId: "" } as PageBlockContent,
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
  "decision-tree": {
    nodes: [],
    trees: [{ id: "default", label: "Tree 1", nodes: [] }],
    tabsMode: "row",
  } as DecisionTreeContent,
};
