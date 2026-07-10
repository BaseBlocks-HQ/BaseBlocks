export type ElementType =
  | "heading"
  | "paragraph"
  | "callout"
  | "code"
  | "divider"
  | "spacer"
  | "file"
  | "richtext"
  | "page"
  | "directory"
  | "flowchart"
  | "decision-tree"
  | "search"
  | "library"
  | "quicklinks"
  | "image";

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

export interface SpacerContent {
  height: "small" | "medium" | "large" | "xlarge";
}

export interface FileContent {
  documentId?: string;
  filename?: string;
  contentType?: string;
  size?: number;
  createdAt?: number;
}

export interface RichTextContent {
  document: unknown[];
}

export interface PageContent {
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
  cells: Record<string, string>;
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
  diagrams: FlowchartDiagram[];
  theme?: string;
  tabsMode?: TabsDisplayMode;
}

export interface DecisionTreeNode {
  id: string;
  parentId: string | null;
  name: string;
  order: number;
  document: unknown[];
}

export interface DecisionTree {
  id: string;
  label: string;
  nodes: DecisionTreeNode[];
}

export interface DecisionTreeContent {
  trees: DecisionTree[];
  tabsMode?: TabsDisplayMode;
}

export interface SearchContent {
  placeholder?: string;
  maxResults?: number;
  showFileType?: boolean;
}

export interface LibraryContent {
  libraryId?: string;
  allowDownloads?: boolean;
}

export type QuicklinkType = "website" | "app";

export interface QuicklinkItem {
  id: string;
  title: string;
  url: string;
  imageUrl?: string;
  linkType?: QuicklinkType;
}

export interface QuicklinksContent {
  links: QuicklinkItem[];
}

export interface ImageContent {
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  objectFit?: "contain" | "cover" | "fill" | "none";
}

export type ContentTypeMap = {
  heading: HeadingContent;
  paragraph: ParagraphContent;
  callout: CalloutContent;
  code: CodeContent;
  divider: DividerContent;
  spacer: SpacerContent;
  file: FileContent;
  richtext: RichTextContent;
  page: PageContent;
  directory: DirectoryContent;
  flowchart: FlowchartContent;
  "decision-tree": DecisionTreeContent;
  search: SearchContent;
  library: LibraryContent;
  quicklinks: QuicklinksContent;
  image: ImageContent;
};

export type ContentFor<T extends ElementType> = ContentTypeMap[T];

export type AnyContent = ContentTypeMap[keyof ContentTypeMap];

export interface TypedElementData<T extends ElementType = ElementType> {
  id: string;
  type: T;
  content: ContentFor<T>;
}

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export const DEFAULT_ELEMENT_CONTENT: {
  [T in ElementType]: ContentFor<T>;
} = {
  heading: { text: "", level: 2 },
  paragraph: { text: "" },
  callout: { text: "", variant: "info" },
  code: { text: "", language: "plaintext" },
  divider: {},
  spacer: { height: "medium" },
  file: {},
  richtext: { document: [] },
  page: { pageId: "" },
  directory: {
    columns: [],
    rows: [],
    settings: {
      copyMode: "none",
      pageSize: 10,
      showSearch: true,
    },
  },
  flowchart: {
    diagrams: [{ id: "default", label: "Diagram 1", mermaidCode: "" }],
    tabsMode: "row",
  },
  "decision-tree": {
    trees: [{ id: "default", label: "Tree 1", nodes: [] }],
    tabsMode: "row",
  },
  search: {
    placeholder: "Search...",
    maxResults: 10,
    showFileType: true,
  },
  library: {
    allowDownloads: true,
  },
  quicklinks: { links: [] },
  image: { url: "" },
};
