"use client";

import type { SectionPreset } from "@baseblocks/domain";
import {
  type AnyContent,
  type ContentFor,
  DEFAULT_ELEMENT_CONTENT,
  type ElementType,
  type SaveStatus,
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
  Search,
  Square,
  TableIcon,
  Workflow,
} from "lucide-react";
import {
  CalloutEditor,
  CalloutRenderer,
  DividerEditor,
  DividerRenderer,
  HeadingEditor,
  HeadingRenderer,
  ParagraphEditor,
  ParagraphRenderer,
  SpacerEditor,
  SpacerRenderer,
} from "./elements/basic";
import { CodeEditor } from "./elements/code";
import { CodeRenderer } from "./elements/code-renderer";
import { DecisionTreeEditor } from "./elements/decision-tree/tree-editor";
import { DecisionTreeRenderer } from "./elements/decision-tree/renderer";
import { DirectoryEditor, DirectoryRenderer } from "./elements/directory";
import { FileEditor } from "./elements/file";
import { FileRenderer } from "./elements/file-renderer";
import { FlowchartEditor, FlowchartRenderer } from "./elements/flowchart";
import { ImageEditor, ImageRenderer } from "./elements/image";
import {
  LibraryConfigPanel,
  LibraryEditor,
  LibraryRenderer,
} from "./elements/library";
import { PageConfigPanel, PageEditor, PageRenderer } from "./elements/page";
import { QuicklinksEditor, QuicklinksRenderer } from "./elements/quicklinks";
import { RichTextEditor, RichTextRenderer } from "./elements/richtext";
import {
  SearchConfigPanel,
  SearchEditor,
  SearchRenderer,
} from "./elements/search";

import type { LucideIcon } from "lucide-react";
import NextImage from "next/image";
import type { ComponentType } from "react";

export interface ElementRendererProps<T extends ElementType = ElementType> {
  id: string;
  type: T;
  content: ContentFor<T>;
}

export type ElementCategory =
  | "site"
  | "customization"
  | "navigation"
  | "sections"
  | "blocks";

export interface ElementEditorProps<T extends ElementType = ElementType> {
  id: string;
  type: T;
  content: ContentFor<T>;
  isSelected?: boolean;
  onUpdate: (content: ContentFor<T>) => void;
  onRemove?: () => void;
  onSaveStatusChange?: (status: SaveStatus) => void;
}

interface ElementPreviewProps {
  className?: string;
}

export interface ElementConfigPanelProps<T extends ElementType = ElementType> {
  content: ContentFor<T>;
  onUpdate: (content: ContentFor<T>) => void;
  onRemove?: () => void;
}

// biome-ignore lint/suspicious/noExplicitAny: element registry stores heterogeneous editor components keyed by runtime element type.
type ElementEditorComponent = ComponentType<any>;
// biome-ignore lint/suspicious/noExplicitAny: element registry stores heterogeneous renderer components keyed by runtime element type.
type ElementRendererComponent = ComponentType<any>;
// biome-ignore lint/suspicious/noExplicitAny: element registry stores heterogeneous settings components keyed by runtime element type.
type ElementConfigPanelComponent = ComponentType<any>;

interface ElementManifestEntry<T extends ElementType = ElementType> {
  type: T;
  category: "blocks";
  label: string;
  description: string;
  icon: LucideIcon;
  keywords?: string[];
  editor: ElementEditorComponent;
  renderer: ElementRendererComponent;
  preview?: ComponentType<ElementPreviewProps>;
  configPanel?: ElementConfigPanelComponent;
  defaultContent: AnyContent;
}

interface SectionManifestEntry {
  type: SectionPreset;
  category: "sections";
  label: string;
  description: string;
  icon: LucideIcon;
  keywords?: string[];
  preview?: ComponentType<ElementPreviewProps>;
}

export type AnyManifestEntry = ElementManifestEntry | SectionManifestEntry;
export type AnyRegistryEntry = AnyManifestEntry;

const blockPreview = (name: string) =>
  themedPreviewImage(
    `/editor/picker/blocks/${name}-light.png`,
    `/editor/picker/blocks/${name}-dark.png`,
  );

const sectionPreview = (name: string) =>
  themedPreviewImage(
    `/editor/picker/layouts/${name}-light.png`,
    `/editor/picker/layouts/${name}-dark.png`,
  );

const sectionPreviewV2 = (name: string) =>
  themedPreviewImage(
    `/editor/picker/layouts/${name}-light-v2.png`,
    `/editor/picker/layouts/${name}-dark-v2.png`,
  );

const shouldOptimizePickerImages = process.env.NODE_ENV === "production";

function themedPreviewImage(lightSrc: string, darkSrc: string) {
  function ThemedPreviewImage({ className }: ElementPreviewProps) {
    return (
      <div
        className={[
          "absolute inset-0 overflow-hidden rounded-[inherit]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <NextImage
          src={lightSrc}
          alt=""
          fill
          className="object-cover object-center dark:hidden"
          sizes="(max-width: 768px) 90vw, 320px"
          unoptimized={!shouldOptimizePickerImages}
        />
        <NextImage
          src={darkSrc}
          alt=""
          fill
          className="hidden object-cover object-center dark:block"
          sizes="(max-width: 768px) 90vw, 320px"
          unoptimized={!shouldOptimizePickerImages}
        />
      </div>
    );
  }

  return ThemedPreviewImage;
}

const SECTION_MANIFEST: SectionManifestEntry[] = [
  {
    type: "single",
    category: "sections",
    label: "One column",
    description: "Full-width single column",
    icon: Square,
    keywords: ["single", "full", "one", "column"],
    preview: sectionPreviewV2("single"),
  },
  {
    type: "columns",
    category: "sections",
    label: "Two columns",
    description: "Horizontal columns",
    icon: Columns3,
    keywords: ["columns", "horizontal", "side"],
    preview: sectionPreview("columns"),
  },
  {
    type: "aside",
    category: "sections",
    label: "Aside",
    description: "Narrow column beside the main page",
    icon: PanelRight,
    keywords: ["sidebar", "vertical", "panel", "aside"],
    preview: sectionPreview("vertical"),
  },
];

const ELEMENT_MANIFEST: ElementManifestEntry[] = [
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
    defaultContent: DEFAULT_ELEMENT_CONTENT.heading,
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
    defaultContent: DEFAULT_ELEMENT_CONTENT.paragraph,
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
    defaultContent: DEFAULT_ELEMENT_CONTENT.callout,
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
    defaultContent: DEFAULT_ELEMENT_CONTENT.divider,
  },
  {
    type: "spacer",
    category: "blocks",
    label: "Spacer",
    description: "Vertical spacing between content",
    icon: MoveVertical,
    keywords: ["space", "gap", "vertical", "padding", "margin"],
    editor: SpacerEditor,
    renderer: SpacerRenderer,
    preview: blockPreview("spacer"),
    defaultContent: DEFAULT_ELEMENT_CONTENT.spacer,
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
    defaultContent: DEFAULT_ELEMENT_CONTENT.code,
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
    defaultContent: DEFAULT_ELEMENT_CONTENT.richtext,
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
    defaultContent: DEFAULT_ELEMENT_CONTENT.file,
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
    defaultContent: DEFAULT_ELEMENT_CONTENT.image,
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
    defaultContent: DEFAULT_ELEMENT_CONTENT.page,
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
    defaultContent: DEFAULT_ELEMENT_CONTENT.directory,
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
    defaultContent: DEFAULT_ELEMENT_CONTENT.flowchart,
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
    defaultContent: DEFAULT_ELEMENT_CONTENT["decision-tree"],
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
    defaultContent: DEFAULT_ELEMENT_CONTENT.search,
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
    defaultContent: DEFAULT_ELEMENT_CONTENT.library,
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
    defaultContent: DEFAULT_ELEMENT_CONTENT.quicklinks,
  },
];

const elementByType = new Map(
  ELEMENT_MANIFEST.map((entry) => [entry.type, entry]),
);
export const getElementsByCategory = (
  category: ElementCategory,
): AnyManifestEntry[] =>
  category === "sections"
    ? SECTION_MANIFEST
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
