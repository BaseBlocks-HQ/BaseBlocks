"use client";

import type { ElementType, LayoutType } from "@baseblocks/domain/elements";
import {
  DEFAULT_BLOCK_CONTENT,
  DEFAULT_MEDIA_CONTENT,
  DEFAULT_SECTION_CONTENT,
} from "@baseblocks/domain/elements";
import {
  AlignLeft,
  Code,
  Columns3,
  FileText,
  FileUp,
  GitFork,
  Heading,
  Image,
  LayoutGrid,
  Library,
  MessageSquare,
  Minus,
  MoveVertical,
  PanelRight,
  Rows3,
  Search,
  Square,
  TableIcon,
  Workflow,
} from "lucide-react";
import {
  CalloutEditor,
  DividerEditor,
  HeadingEditor,
  ParagraphEditor,
  SpacerEditor,
} from "./elements/basic";
import {
  CalloutRenderer,
  DividerRenderer,
  HeadingRenderer,
  ParagraphRenderer,
  SpacerRenderer,
} from "./elements/basic-renderers";
import { CodeEditor } from "./elements/code";
import { CodeRenderer } from "./elements/code-renderer";
import {
  DecisionTreeEditor,
  DecisionTreeRenderer,
} from "./elements/decision-tree";
import {
  DirectoryConfigPanel,
  DirectoryEditor,
  DirectoryRenderer,
} from "./elements/directory";
import { FileEditor } from "./elements/file";
import { FileRenderer } from "./elements/file-renderer";
import { FlowchartEditor, FlowchartRenderer } from "./elements/flowchart";
import { ImageEditor, ImageRenderer } from "./elements/image";
import {
  LibraryConfigPanel,
  LibraryEditor,
  LibraryRenderer,
} from "./elements/library";
import { PageEditor } from "./elements/page";
import { PageConfigPanel } from "./elements/page-config";
import { PageRenderer } from "./elements/page-renderer";
import { QuicklinksEditor, QuicklinksRenderer } from "./elements/quicklinks";
import { RichTextEditor } from "./elements/richtext";
import { RichTextRenderer } from "./elements/richtext-renderer";
import {
  SearchConfigPanel,
  SearchEditor,
  SearchRenderer,
} from "./elements/search";
import { themedPickerImagePreview } from "./shared/picker-image-preview";
import type {
  AnyManifestEntry,
  ElementCategory,
  ElementManifestEntry,
  LayoutManifestEntry,
} from "./types";

export type {
  AnyManifestEntry,
  AnyRegistryEntry,
  ElementCategory,
  ElementConfigPanelProps,
  ElementEditorProps,
  ElementManifestEntry,
  ElementPreviewProps,
  ElementRendererProps,
  LayoutManifestEntry,
} from "./types";

const blockPreview = (name: string) =>
  themedPickerImagePreview(
    `/editor/picker/blocks/${name}-light.png`,
    `/editor/picker/blocks/${name}-dark.png`,
  );

const layoutPreview = (name: string) =>
  themedPickerImagePreview(
    `/editor/picker/layouts/${name}-light.png`,
    `/editor/picker/layouts/${name}-dark.png`,
  );

const layoutPreviewV2 = (name: string) =>
  themedPickerImagePreview(
    `/editor/picker/layouts/${name}-light-v2.png`,
    `/editor/picker/layouts/${name}-dark-v2.png`,
  );

export const ELEMENT_CATEGORIES: Array<{
  category: ElementCategory;
  label: string;
  order: number;
}> = [
  { category: "site", label: "Site Settings", order: 0 },
  { category: "customization", label: "Customization", order: 1 },
  { category: "navigation", label: "Navigation", order: 2 },
  { category: "layouts", label: "Layouts", order: 3 },
  { category: "blocks", label: "Blocks", order: 4 },
];

export const LAYOUT_MANIFEST: LayoutManifestEntry[] = [
  {
    type: "single",
    category: "layouts",
    label: "Single",
    description: "Full-width single column",
    icon: Square,
    keywords: ["single", "full", "one", "column"],
    preview: layoutPreviewV2("single"),
  },
  {
    type: "columns",
    category: "layouts",
    label: "Columns",
    description: "Horizontal columns",
    icon: Columns3,
    keywords: ["columns", "horizontal", "side"],
    preview: layoutPreview("columns"),
  },
  {
    type: "rows",
    category: "layouts",
    label: "Rows",
    description: "Vertical stack of rows",
    icon: Rows3,
    keywords: ["rows", "vertical", "stack"],
    preview: layoutPreview("rows"),
  },
  {
    type: "grid",
    category: "layouts",
    label: "Grid",
    description: "Grid layout",
    icon: LayoutGrid,
    keywords: ["grid", "matrix", "cells"],
    preview: layoutPreview("grid"),
  },
  {
    type: "vertical",
    category: "layouts",
    label: "Sidebar",
    description: "Sidebar beside main content",
    icon: PanelRight,
    keywords: ["sidebar", "vertical", "panel", "aside"],
    preview: layoutPreview("vertical"),
  },
  {
    type: "spacer",
    category: "layouts",
    label: "Spacer",
    description: "Vertical spacing",
    icon: MoveVertical,
    keywords: ["spacer", "gap", "space", "vertical"],
    preview: layoutPreview("spacer"),
  },
];

export const ELEMENT_MANIFEST: ElementManifestEntry[] = [
  {
    type: "heading",
    category: "blocks",
    label: "Heading",
    description: "A title or heading with adjustable size",
    icon: Heading,
    keywords: ["title", "h1", "h2", "h3", "h4", "h5", "header"],
    editor: HeadingEditor,
    renderer: HeadingRenderer,
    preview: blockPreview("heading"),
    defaultContent: DEFAULT_BLOCK_CONTENT.heading,
  },
  {
    type: "paragraph",
    category: "blocks",
    label: "Paragraph",
    description: "Plain text content",
    icon: AlignLeft,
    keywords: ["text", "body", "content", "write"],
    editor: ParagraphEditor,
    renderer: ParagraphRenderer,
    preview: blockPreview("paragraph"),
    defaultContent: DEFAULT_BLOCK_CONTENT.paragraph,
  },
  {
    type: "callout",
    category: "blocks",
    label: "Callout",
    description: "Highlighted message box",
    icon: MessageSquare,
    keywords: ["alert", "note", "warning", "info", "tip", "message"],
    editor: CalloutEditor,
    renderer: CalloutRenderer,
    preview: blockPreview("callout"),
    defaultContent: DEFAULT_BLOCK_CONTENT.callout,
  },
  {
    type: "divider",
    category: "blocks",
    label: "Divider",
    description: "Horizontal line separator",
    icon: Minus,
    keywords: ["line", "separator", "hr", "horizontal"],
    editor: DividerEditor,
    renderer: DividerRenderer,
    preview: blockPreview("divider"),
    defaultContent: DEFAULT_BLOCK_CONTENT.divider,
  },
  {
    type: "block-spacer",
    category: "blocks",
    label: "Spacer",
    description: "Vertical spacing between content",
    icon: MoveVertical,
    keywords: ["space", "gap", "vertical", "padding", "margin"],
    editor: SpacerEditor,
    renderer: SpacerRenderer,
    preview: blockPreview("spacer"),
    defaultContent: DEFAULT_BLOCK_CONTENT["block-spacer"],
  },
  {
    type: "code",
    category: "blocks",
    label: "Code",
    description: "Code snippet with syntax highlighting",
    icon: Code,
    keywords: ["code", "snippet", "programming", "syntax", "script"],
    editor: CodeEditor,
    renderer: CodeRenderer,
    preview: blockPreview("code"),
    defaultContent: DEFAULT_BLOCK_CONTENT.code,
  },
  {
    type: "richtext",
    category: "blocks",
    label: "Rich Text",
    description: "Rich text editor with formatting, lists, and more",
    icon: AlignLeft,
    keywords: ["text", "rich", "editor", "blocknote", "write", "format"],
    editor: RichTextEditor,
    renderer: RichTextRenderer,
    preview: blockPreview("richtext"),
    defaultContent: DEFAULT_BLOCK_CONTENT.richtext,
  },
  {
    type: "file",
    category: "blocks",
    label: "File",
    description: "Upload and preview a single file",
    icon: FileUp,
    keywords: ["file", "media", "document", "pdf", "upload"],
    editor: FileEditor,
    renderer: FileRenderer,
    preview: blockPreview("file"),
    defaultContent: DEFAULT_BLOCK_CONTENT.file,
  },
  {
    type: "image",
    category: "blocks",
    label: "Image",
    description: "Single image with caption",
    icon: Image,
    keywords: ["image", "picture", "photo", "graphic"],
    editor: ImageEditor,
    renderer: ImageRenderer,
    preview: blockPreview("image"),
    defaultContent: DEFAULT_MEDIA_CONTENT.image,
  },
  {
    type: "page",
    category: "blocks",
    label: "Page",
    description: "Reference a page and open it in a panel",
    icon: FileText,
    keywords: ["page", "process", "document", "nested", "panel"],
    editor: PageEditor,
    renderer: PageRenderer,
    preview: blockPreview("page"),
    configPanel: PageConfigPanel,
    defaultContent: DEFAULT_BLOCK_CONTENT.page,
  },
  {
    type: "directory",
    category: "blocks",
    label: "Directory",
    description: "Configurable data table with search and pagination",
    icon: TableIcon,
    keywords: ["directory", "table", "data", "list", "grid", "spreadsheet"],
    editor: DirectoryEditor,
    renderer: DirectoryRenderer,
    preview: blockPreview("directory"),
    configPanel: DirectoryConfigPanel,
    defaultContent: DEFAULT_BLOCK_CONTENT.directory,
  },
  {
    type: "flowchart",
    category: "blocks",
    label: "Flowchart",
    description: "Mermaid diagram with live preview",
    icon: Workflow,
    keywords: ["flowchart", "diagram", "mermaid", "process", "workflow"],
    editor: FlowchartEditor,
    renderer: FlowchartRenderer,
    preview: blockPreview("flowchart"),
    defaultContent: DEFAULT_BLOCK_CONTENT.flowchart,
  },
  {
    type: "decision-tree",
    category: "blocks",
    label: "Decision Tree",
    description:
      "Interactive decision tree with branching options and rich content",
    icon: GitFork,
    keywords: ["decision", "tree", "branch", "wizard", "guide"],
    editor: DecisionTreeEditor,
    renderer: DecisionTreeRenderer,
    preview: blockPreview("decision-tree"),
    defaultContent: DEFAULT_BLOCK_CONTENT["decision-tree"],
  },
  {
    type: "search",
    category: "blocks",
    label: "Search",
    description: "Document search with filters",
    icon: Search,
    keywords: ["search", "find", "query", "lookup", "filter"],
    editor: SearchEditor,
    renderer: SearchRenderer,
    preview: blockPreview("search"),
    configPanel: SearchConfigPanel,
    defaultContent: DEFAULT_SECTION_CONTENT.search,
  },
  {
    type: "library",
    category: "blocks",
    label: "Library",
    description: "Document library with folders",
    icon: Library,
    keywords: ["library", "documents", "files", "folder", "storage"],
    editor: LibraryEditor,
    renderer: LibraryRenderer,
    preview: blockPreview("library"),
    configPanel: LibraryConfigPanel,
    defaultContent: DEFAULT_SECTION_CONTENT.library,
  },
  {
    type: "quicklinks",
    category: "blocks",
    label: "Quick Links",
    description: "Grid of linked cards",
    icon: LayoutGrid,
    keywords: ["links", "cards", "grid", "shortcuts", "bookmarks"],
    editor: QuicklinksEditor,
    renderer: QuicklinksRenderer,
    preview: blockPreview("quicklinks"),
    defaultContent: DEFAULT_SECTION_CONTENT.quicklinks,
  },
];

const elementByType = new Map(
  ELEMENT_MANIFEST.map((entry) => [entry.type, entry]),
);
const layoutByType = new Map(
  LAYOUT_MANIFEST.map((entry) => [entry.type, entry]),
);

export const getSortedCategories = () =>
  [...ELEMENT_CATEGORIES].sort((a, b) => a.order - b.order);

export const getElementsByCategory = (
  category: ElementCategory,
): AnyManifestEntry[] =>
  category === "layouts"
    ? LAYOUT_MANIFEST
    : ELEMENT_MANIFEST.filter((entry) => entry.category === category);

export const getElementEditor = (type: ElementType) =>
  elementByType.get(type)?.editor;

export const getElementRenderer = (type: ElementType) =>
  elementByType.get(type)?.renderer;

export const getElementConfigPanel = (type: ElementType) =>
  elementByType.get(type)?.configPanel;

export const hasElementConfigPanel = (type: ElementType) =>
  Boolean(getElementConfigPanel(type));

export const getDefaultContent = (type: ElementType) =>
  elementByType.get(type)?.defaultContent;

export const getElementLabel = (type: ElementType | LayoutType) =>
  elementByType.get(type as ElementType)?.label ??
  layoutByType.get(type as LayoutType)?.label ??
  type;
