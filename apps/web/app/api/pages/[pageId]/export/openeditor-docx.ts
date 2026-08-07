import type {
  OpenEditorDocument,
  ProseMirrorMark,
  ProseMirrorNode,
} from "@openeditor/core";
import { isOpenEditorDocument } from "@openeditor/core";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  type FileChild,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  type ParagraphChild,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  UnderlineType,
  VerticalAlignTable,
  WidthType,
} from "docx";

const ORDERED_LIST_LEVELS = 9;
const TABLE_WIDTH_DXA = 9120;

type NumberingConfig = NonNullable<
  ConstructorParameters<typeof Document>[0]["numbering"]
>["config"][number];

export type OpenEditorDocxComposition = {
  children: FileChild[];
  numbering: NumberingConfig[];
};

export type OpenEditorDocxOptions = {
  leadingChildren?: readonly FileChild[];
  title?: string;
};

type BlockContext = {
  listLevel: number;
};

type ParagraphOptions = {
  bold?: boolean;
  bulletLevel?: number;
  heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel];
  indent?: number;
  orderedList?: { level: number; reference: string };
};

class OpenEditorDocxComposer {
  private orderedListIndex = 0;
  private readonly numbering: NumberingConfig[] = [];

  compose(document: OpenEditorDocument): OpenEditorDocxComposition {
    return {
      children: this.composeBlocks(document.content, { listLevel: 0 }),
      numbering: this.numbering,
    };
  }

  private composeBlocks(
    nodes: readonly ProseMirrorNode[],
    context: BlockContext,
  ): FileChild[] {
    return nodes.flatMap((node) => this.composeBlock(node, context));
  }

  private composeBlock(
    node: ProseMirrorNode,
    context: BlockContext,
  ): FileChild[] {
    switch (node.type) {
      case "paragraph":
        return [this.createParagraph(node)];
      case "heading":
        return [
          this.createParagraph(node, {
            heading: headingLevel(node.attrs?.level),
          }),
        ];
      case "bulletList":
        return this.composeList(node, false, context);
      case "orderedList":
        return this.composeList(node, true, context);
      case "taskList":
        return this.composeTaskList(node, context);
      case "table":
        return [this.composeTable(node)];
      case "blockquote":
        return (node.content ?? []).flatMap((child) =>
          isTextBlock(child)
            ? [this.createParagraph(child, { indent: 720 })]
            : this.composeBlock(child, context),
        );
      case "codeBlock":
        return [this.createCodeBlock(node)];
      case "horizontalRule":
      case "divider":
        return [
          new Paragraph({ thematicBreak: true, spacing: { after: 160 } }),
        ];
      case "page":
        return [this.createPageLink(node)];
      case "image":
        return [this.createImageFallback(node)];
      case "attachment":
        return [this.createAttachmentFallback(node)];
      case "baseblocksQuickLinks":
        return this.composeQuickLinks(node);
      case "baseblocksDirectory":
        return this.composeDirectoryFallback(node);
      case "baseblocksSearch":
        return [
          this.createFallbackParagraph(
            "Search block",
            readNestedString(node.attrs, ["search", "placeholder"]),
          ),
        ];
      case "baseblocksLibrary":
        return [
          this.createFallbackParagraph(
            "Document library",
            readNestedString(node.attrs, ["library", "libraryId"]),
          ),
        ];
      case "baseblocksDecisionTree":
        return this.composeDecisionTreeFallback(node);
      case "baseblocksPageTabs":
        return this.composePageTabs(node, context);
      case "text":
        return [this.createParagraph({ type: "paragraph", content: [node] })];
      default:
        return this.composeBlocks(node.content ?? [], context);
    }
  }

  private composeList(
    node: ProseMirrorNode,
    ordered: boolean,
    context: BlockContext,
  ): FileChild[] {
    const level = Math.min(context.listLevel, ORDERED_LIST_LEVELS - 1);
    const reference = ordered
      ? this.createOrderedListReference(readPositiveInteger(node.attrs?.start))
      : undefined;

    return (node.content ?? []).flatMap((item) => {
      const children = item.content ?? [];
      let markerApplied = false;

      return children.flatMap((child): FileChild[] => {
        if (child.type === "bulletList" || child.type === "orderedList") {
          return this.composeBlock(child, {
            listLevel: context.listLevel + 1,
          });
        }

        if (!markerApplied && isTextBlock(child)) {
          markerApplied = true;
          return [
            this.createParagraph(child, {
              bulletLevel: ordered ? undefined : level,
              orderedList: reference ? { level, reference } : undefined,
            }),
          ];
        }

        return this.composeBlock(child, {
          listLevel: context.listLevel + 1,
        });
      });
    });
  }

  private composeTaskList(
    node: ProseMirrorNode,
    context: BlockContext,
  ): FileChild[] {
    return (node.content ?? []).flatMap((item) => {
      const checked = item.attrs?.checked === true;
      const children = item.content ?? [];
      let markerApplied = false;

      return children.flatMap((child): FileChild[] => {
        if (!markerApplied && isTextBlock(child)) {
          markerApplied = true;
          return [
            this.createParagraph(
              {
                ...child,
                content: [
                  { type: "text", text: checked ? "☒ " : "☐ " },
                  ...(child.content ?? []),
                ],
              },
              { indent: 360 * (context.listLevel + 1) },
            ),
          ];
        }
        return this.composeBlock(child, {
          listLevel: context.listLevel + 1,
        });
      });
    });
  }

  private createParagraph(
    node: ProseMirrorNode,
    options: ParagraphOptions = {},
  ): Paragraph {
    return new Paragraph({
      children: inlineChildren(node.content ?? [], options.bold),
      heading: options.heading,
      bullet:
        options.bulletLevel === undefined
          ? undefined
          : { level: options.bulletLevel },
      numbering: options.orderedList,
      indent:
        options.indent === undefined ? undefined : { left: options.indent },
      spacing: {
        after: options.heading ? 160 : 120,
        before: options.heading ? 160 : 0,
      },
    });
  }

  private createCodeBlock(node: ProseMirrorNode): Paragraph {
    const text = collectText(node);
    return new Paragraph({
      children: text.split("\n").flatMap((line, index) => [
        new TextRun({
          break: index === 0 ? undefined : 1,
          font: "Courier New",
          size: 20,
          text: line,
        }),
      ]),
      shading: { fill: "F3F4F6", type: ShadingType.CLEAR },
      spacing: { after: 160, before: 80 },
    });
  }

  private createPageLink(node: ProseMirrorNode): Paragraph {
    const children = inlineChildren(node.content ?? []);
    const href = safeHyperlinkTarget(node.attrs?.href);
    return new Paragraph({
      children: href
        ? [new ExternalHyperlink({ children, link: href })]
        : children,
      spacing: { after: 120 },
    });
  }

  private createImageFallback(node: ProseMirrorNode): Paragraph {
    const description =
      readString(node.attrs?.alt) ??
      readString(node.attrs?.title) ??
      "Image without alternative text";
    return this.createFallbackParagraph("Image", description);
  }

  private createAttachmentFallback(node: ProseMirrorNode): Paragraph {
    const name = readString(node.attrs?.name) ?? "Unnamed attachment";
    const details = [
      readString(node.attrs?.mimeType),
      formatByteSize(node.attrs?.size),
    ].filter((value): value is string => Boolean(value));
    return this.createFallbackParagraph(
      "Attachment",
      details.length > 0 ? `${name} — ${details.join(", ")}` : name,
    );
  }

  private composeQuickLinks(node: ProseMirrorNode): FileChild[] {
    const links = readNestedRecords(node.attrs, ["links"]);
    if (links.length === 0) {
      return [this.createFallbackParagraph("Quick links", "No links")];
    }
    return [
      this.createFallbackParagraph("Quick links"),
      ...links.map((link, index) => {
        const label =
          readString(link.title) ?? readString(link.url) ?? `Link ${index + 1}`;
        const target = safeHyperlinkTarget(link.url);
        const children = [new TextRun(label)];
        return new Paragraph({
          bullet: { level: 0 },
          children: target
            ? [new ExternalHyperlink({ children, link: target })]
            : children,
          spacing: { after: 80 },
        });
      }),
    ];
  }

  private composeDirectoryFallback(node: ProseMirrorNode): FileChild[] {
    const directories = readNestedRecords(node.attrs, [
      "directory",
      "directories",
    ]);
    if (directories.length === 0) {
      return [this.createFallbackParagraph("Directory", "No entries")];
    }
    return directories.map((directory, index) => {
      const label = readString(directory.label) ?? `Directory ${index + 1}`;
      const rowCount = Array.isArray(directory.rows)
        ? directory.rows.length
        : 0;
      return this.createFallbackParagraph(
        "Directory",
        `${label} — ${rowCount} ${rowCount === 1 ? "entry" : "entries"}`,
      );
    });
  }

  private composeDecisionTreeFallback(node: ProseMirrorNode): FileChild[] {
    const trees = readNestedRecords(node.attrs, ["decisionTree", "trees"]);
    if (trees.length === 0) {
      return [this.createFallbackParagraph("Decision tree", "No trees")];
    }
    return trees.map((tree, index) => {
      const label = readString(tree.label) ?? `Tree ${index + 1}`;
      const nodeCount = Array.isArray(tree.nodes) ? tree.nodes.length : 0;
      return this.createFallbackParagraph(
        "Decision tree",
        `${label} — ${nodeCount} ${nodeCount === 1 ? "node" : "nodes"}`,
      );
    });
  }

  private composePageTabs(
    node: ProseMirrorNode,
    context: BlockContext,
  ): FileChild[] {
    const tabs = readNestedRecords(node.attrs, ["tabs", "tabs"]);
    if (tabs.length === 0) {
      return [this.createFallbackParagraph("Page tabs", "No tabs")];
    }
    return tabs.flatMap((tab, index) => {
      const label = readString(tab.label) ?? `Tab ${index + 1}`;
      const document = tab.document;
      return [
        this.createFallbackParagraph("Page tab", label),
        ...(isOpenEditorDocument(document)
          ? this.composeBlocks(document.content, context)
          : [this.createFallbackParagraph("Tab content", "Unavailable")]),
      ];
    });
  }

  private createFallbackParagraph(label: string, detail?: string): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({ bold: true, text: `[${label}]` }),
        ...(detail ? [new TextRun({ text: ` ${detail}` })] : []),
      ],
      spacing: { after: 120 },
    });
  }

  private composeTable(node: ProseMirrorNode): Table {
    const sourceRows = (node.content ?? []).filter(
      (child) => child.type === "tableRow",
    );
    const columnCount = Math.max(
      1,
      ...sourceRows.map((row) =>
        (row.content ?? []).reduce(
          (total, cell) => total + tableCellSpan(cell, "colspan"),
          0,
        ),
      ),
    );
    const columnWidths = distributeWidth(TABLE_WIDTH_DXA, columnCount);

    const rows = sourceRows.map((row) => {
      const sourceCells = row.content ?? [];
      const isHeader = sourceCells.some((cell) => cell.type === "tableHeader");
      const cells = sourceCells.map((cell) => {
        const headerCell = cell.type === "tableHeader";
        const columnSpan = tableCellSpan(cell, "colspan");
        const rowSpan = tableCellSpan(cell, "rowspan");
        const children = this.composeTableCellChildren(cell, headerCell);

        return new TableCell({
          children,
          columnSpan,
          margins: { bottom: 100, left: 120, right: 120, top: 100 },
          rowSpan,
          shading: headerCell
            ? { fill: "E5E7EB", type: ShadingType.CLEAR }
            : undefined,
          verticalAlign: VerticalAlignTable.CENTER,
          width: {
            size: Math.round((TABLE_WIDTH_DXA * columnSpan) / columnCount),
            type: WidthType.DXA,
          },
        });
      });

      return new TableRow({
        cantSplit: true,
        children: cells,
        tableHeader: isHeader,
      });
    });

    return new Table({
      borders: {
        bottom: { color: "D1D5DB", size: 4, style: BorderStyle.SINGLE },
        insideHorizontal: {
          color: "D1D5DB",
          size: 4,
          style: BorderStyle.SINGLE,
        },
        insideVertical: {
          color: "D1D5DB",
          size: 4,
          style: BorderStyle.SINGLE,
        },
        left: { color: "D1D5DB", size: 4, style: BorderStyle.SINGLE },
        right: { color: "D1D5DB", size: 4, style: BorderStyle.SINGLE },
        top: { color: "D1D5DB", size: 4, style: BorderStyle.SINGLE },
      },
      columnWidths,
      indent: { size: 120, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      rows: rows.length > 0 ? rows : [emptyTableRow(columnWidths)],
      width: { size: TABLE_WIDTH_DXA, type: WidthType.DXA },
    });
  }

  private composeTableCellChildren(
    cell: ProseMirrorNode,
    bold: boolean,
  ): (Paragraph | Table)[] {
    const children = (cell.content ?? []).flatMap(
      (child): (Paragraph | Table)[] => {
        if (isTextBlock(child)) return [this.createParagraph(child, { bold })];
        if (child.type === "table") return [this.composeTable(child)];
        return (child.content ?? []).flatMap((nested) =>
          isTextBlock(nested) ? [this.createParagraph(nested, { bold })] : [],
        );
      },
    );
    return children.length > 0 ? children : [new Paragraph("")];
  }

  private createOrderedListReference(start = 1): string {
    const reference = `openeditor-ordered-${this.orderedListIndex++}`;
    this.numbering.push({
      levels: Array.from({ length: ORDERED_LIST_LEVELS }, (_, level) => ({
        alignment: AlignmentType.START,
        format: LevelFormat.DECIMAL,
        level,
        start,
        style: {
          paragraph: {
            indent: { hanging: 360, left: 720 * (level + 1) },
          },
        },
        text: `%${level + 1}.`,
      })),
      reference,
    });
    return reference;
  }
}

function tableCellSpan(
  node: ProseMirrorNode,
  attribute: "colspan" | "rowspan",
): number {
  const value = node.attrs?.[attribute];
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? Math.min(value, 100)
    : 1;
}

export function composeOpenEditorDocx(
  document: OpenEditorDocument,
): OpenEditorDocxComposition {
  return new OpenEditorDocxComposer().compose(document);
}

export function createOpenEditorDocx(
  document: OpenEditorDocument,
  options: OpenEditorDocxOptions = {},
): Document {
  const composition = composeOpenEditorDocx(document);
  return new Document({
    numbering: { config: composition.numbering },
    sections: [
      {
        children: [...(options.leadingChildren ?? []), ...composition.children],
        properties: {
          page: {
            margin: { bottom: 1440, left: 1440, right: 1440, top: 1440 },
          },
        },
      },
    ],
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 22 },
          paragraph: { spacing: { after: 120 } },
        },
      },
    },
    title: options.title,
  });
}

export async function renderOpenEditorDocx(
  document: OpenEditorDocument,
  options: OpenEditorDocxOptions = {},
): Promise<Buffer> {
  return await Packer.toBuffer(createOpenEditorDocx(document, options));
}

function inlineChildren(
  nodes: readonly ProseMirrorNode[],
  bold = false,
): ParagraphChild[] {
  return nodes.flatMap((node): ParagraphChild[] => {
    if (node.type === "hardBreak") return [new TextRun({ break: 1 })];
    if (node.type !== "text") return inlineChildren(node.content ?? [], bold);

    const marks = node.marks ?? [];
    const link = marks.find((mark) => mark.type === "link");
    const runs = textRuns(node.text ?? "", marks, bold);
    const href = safeHyperlinkTarget(link?.attrs?.href);
    return href
      ? [new ExternalHyperlink({ children: runs, link: href })]
      : runs;
  });
}

function textRuns(
  text: string,
  marks: readonly ProseMirrorMark[],
  forceBold: boolean,
): TextRun[] {
  const hasMark = (type: string) => marks.some((mark) => mark.type === type);
  const isLink = hasMark("link");
  const isCode = hasMark("code");

  return text.split("\n").map(
    (line, index) =>
      new TextRun({
        bold: forceBold || hasMark("bold") || undefined,
        break: index === 0 ? undefined : 1,
        color: isLink ? "0563C1" : undefined,
        font: isCode ? "Courier New" : undefined,
        italics: hasMark("italic") || undefined,
        shading: isCode
          ? { fill: "F3F4F6", type: ShadingType.CLEAR }
          : undefined,
        strike: hasMark("strike") || undefined,
        text: line,
        underline:
          hasMark("underline") || isLink
            ? { type: UnderlineType.SINGLE }
            : undefined,
      }),
  );
}

function headingLevel(
  value: unknown,
): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  const levels = [
    HeadingLevel.HEADING_1,
    HeadingLevel.HEADING_2,
    HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4,
    HeadingLevel.HEADING_5,
    HeadingLevel.HEADING_6,
  ] as const;
  const level = typeof value === "number" ? Math.trunc(value) : 1;
  return (
    levels[Math.min(Math.max(level, 1), levels.length) - 1] ??
    HeadingLevel.HEADING_1
  );
}

function isTextBlock(node: ProseMirrorNode): boolean {
  return node.type === "paragraph" || node.type === "heading";
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function safeHyperlinkTarget(value: unknown): string | undefined {
  const href = readString(value)?.trim();
  if (!href || !/^[a-z][a-z\d+.-]*:/i.test(href)) return undefined;
  try {
    const url = new URL(href);
    return url.protocol === "http:" ||
      url.protocol === "https:" ||
      url.protocol === "mailto:"
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

function readNestedRecords(
  source: unknown,
  path: readonly string[],
): Record<string, unknown>[] {
  const value = readNestedValue(source, path);
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null && !Array.isArray(item),
      )
    : [];
}

function readNestedString(
  source: unknown,
  path: readonly string[],
): string | undefined {
  return readString(readNestedValue(source, path));
}

function readNestedValue(source: unknown, path: readonly string[]): unknown {
  let value = source;
  for (const key of path) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return undefined;
    }
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

function formatByteSize(value: unknown): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  if (value < 1024) return `${Math.trunc(value)} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = value / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && size >= 1024; index += 1) {
    size /= 1024;
    unit = units[index];
  }
  return `${Number(size.toFixed(1))} ${unit}`;
}

function readPositiveInteger(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : 1;
}

function collectText(node: ProseMirrorNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map(collectText).join("");
}

function distributeWidth(total: number, columns: number): number[] {
  const width = Math.floor(total / columns);
  return Array.from({ length: columns }, (_, index) =>
    index === columns - 1 ? total - width * (columns - 1) : width,
  );
}

function emptyTableRow(columnWidths: readonly number[]): TableRow {
  return new TableRow({
    children: columnWidths.map(
      (width) =>
        new TableCell({
          children: [new Paragraph("")],
          width: { size: width, type: WidthType.DXA },
        }),
    ),
  });
}
