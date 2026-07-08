import {
  AlignmentType,
  Document,
  HeadingLevel,
  type ISectionOptions,
  LevelFormat,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  convertInchesToTwip,
} from "docx";

export type PageExportFormat = "docx";
export type PageExportMode = "draft" | "published";

export type PageExportBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list-item"; ordered: boolean; level: number; text: string }
  | { type: "task-item"; checked: boolean; level: number; text: string }
  | { type: "code"; language?: string; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "unsupported"; label: string; text: string };

export interface PageExportDocument {
  title: string;
  blocks: PageExportBlock[];
}

interface SerializableLayout {
  order: number;
  type?: string;
  settings?: unknown;
  slots: Array<{
    position: number;
    blocks: Array<{
      id?: string;
      type: string;
      content: unknown;
    }>;
  }>;
}

const NUMBERING_REFERENCE = "baseblocks-numbered-list";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null
    ? (value as UnknownRecord)
    : null;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/\s+\n/g, "\n").trim();
}

function splitParagraphs(value: string): string[] {
  const normalized = normalizeText(value);
  if (!normalized) {
    return [];
  }

  return normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function clampHeadingLevel(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 2;
  }

  return Math.min(Math.max(Math.floor(value), 1), 5);
}

function clampListLevel(value: number): number {
  return Math.min(Math.max(Math.floor(value), 0), 7);
}

function extractInlineText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content.map((part) => extractInlineText(part)).join("");
  }

  const record = asRecord(content);
  if (!record) {
    return "";
  }

  return [
    readString(record.text),
    Array.isArray(record.content) ? extractInlineText(record.content) : "",
    Array.isArray(record.children) ? extractInlineText(record.children) : "",
  ]
    .filter(Boolean)
    .join("");
}

function humanizeBlockType(type: string): string {
  const normalized = type.replace(/[-_]/g, " ").trim();
  if (!normalized) {
    return "Block";
  }

  return normalized
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// Failure modes:
// - Unsupported interactive blocks should surface visibly instead of silently disappearing.
// - BlockNote content can arrive as strings, inline arrays, or nested child blocks.
// - Layouts may contain multi-slot structures; export should follow stable slot order.
function normalizeBlockNoteBlocks(
  blocks: unknown[],
  level = 0,
): PageExportBlock[] {
  const result: PageExportBlock[] = [];

  for (const rawBlock of blocks) {
    const block = asRecord(rawBlock);
    if (!block) {
      continue;
    }

    const type = readString(block.type);
    const props = asRecord(block.props);
    const text = normalizeText(extractInlineText(block.content));

    switch (type) {
      case "heading":
        if (text) {
          result.push({
            type: "heading",
            level: clampHeadingLevel(props?.level),
            text,
          });
        }
        break;
      case "paragraph":
      case "blockquote":
        for (const paragraph of splitParagraphs(text)) {
          result.push({ type: "paragraph", text: paragraph });
        }
        break;
      case "bulletListItem":
        if (text) {
          result.push({
            type: "list-item",
            ordered: false,
            level: clampListLevel(level),
            text,
          });
        }
        break;
      case "numberedListItem":
        if (text) {
          result.push({
            type: "list-item",
            ordered: true,
            level: clampListLevel(level),
            text,
          });
        }
        break;
      case "checkListItem":
        if (text) {
          result.push({
            type: "task-item",
            checked: props?.checked === true,
            level: clampListLevel(level),
            text,
          });
        }
        break;
      case "codeBlock":
        if (text) {
          result.push({
            type: "code",
            language: readString(props?.language) || undefined,
            text,
          });
        }
        break;
      default:
        for (const paragraph of splitParagraphs(text)) {
          result.push({ type: "paragraph", text: paragraph });
        }
        break;
    }

    if (Array.isArray(block.children) && block.children.length > 0) {
      const nextLevel =
        type === "bulletListItem" ||
        type === "numberedListItem" ||
        type === "checkListItem"
          ? level + 1
          : level;
      result.push(...normalizeBlockNoteBlocks(block.children, nextLevel));
    }
  }

  return result;
}

function normalizeDirectoryBlock(content: UnknownRecord): PageExportBlock[] {
  const columns = Array.isArray(content.columns)
    ? content.columns
        .map((column) => asRecord(column))
        .filter((column): column is UnknownRecord => column !== null)
    : [];

  if (columns.length === 0) {
    return [];
  }

  const headers = columns.map((column) => readString(column.header).trim());
  const rows = Array.isArray(content.rows)
    ? content.rows
        .map((row) => asRecord(row))
        .filter((row): row is UnknownRecord => row !== null)
        .map((row) => {
          const cells = asRecord(row.cells) ?? {};
          return columns.map((column) =>
            normalizeText(readString(cells[readString(column.id)])),
          );
        })
    : [];

  return [{ type: "table", headers, rows }];
}

function normalizeBlock(
  type: string,
  content: unknown,
  labelsByPageId: ReadonlyMap<string, string>,
): PageExportBlock[] {
  const record = asRecord(content);
  if (!record) {
    return [];
  }

  switch (type) {
    case "heading": {
      const text = normalizeText(readString(record.text));
      if (!text) {
        return [];
      }
      return [
        {
          type: "heading",
          level: clampHeadingLevel(record.level),
          text,
        },
      ];
    }
    case "paragraph":
      return splitParagraphs(readString(record.text)).map((text) => ({
        type: "paragraph",
        text,
      }));
    case "callout": {
      const body = normalizeText(readString(record.text));
      if (!body) {
        return [];
      }

      const variant = readString(record.variant);
      const prefix = variant ? `${humanizeBlockType(variant)}: ` : "Callout: ";

      return [{ type: "paragraph", text: `${prefix}${body}` }];
    }
    case "code": {
      const text = normalizeText(readString(record.text));
      if (!text) {
        return [];
      }

      return [
        {
          type: "code",
          language: readString(record.language) || undefined,
          text,
        },
      ];
    }
    case "richtext":
      return Array.isArray(record.document)
        ? normalizeBlockNoteBlocks(record.document)
        : [];
    case "directory":
      return normalizeDirectoryBlock(record);
    case "page": {
      const pageId = readString(record.pageId);
      const title = labelsByPageId.get(pageId);
      return title
        ? [
            {
              type: "paragraph",
              text: `Referenced page: ${title}`,
            },
          ]
        : [];
    }
    case "divider":
    case "block-spacer":
      return [];
    case "flowchart":
    case "decision-tree":
    case "library":
    case "search":
    case "image":
    case "quicklinks":
      return [
        {
          type: "unsupported",
          label: humanizeBlockType(type),
          text: "This block type is not included in Word exports yet.",
        },
      ];
    default: {
      const text = normalizeText(
        [readString(record.text), readString(record.title)]
          .filter(Boolean)
          .join(" "),
      );
      if (text) {
        return [{ type: "paragraph", text }];
      }
      return [];
    }
  }
}

export function buildPageExportDocument(args: {
  pageTitle: string;
  layouts: SerializableLayout[];
  labelsByPageId?: ReadonlyMap<string, string>;
}): PageExportDocument {
  const title = normalizeText(args.pageTitle) || "Untitled page";
  const labelsByPageId = args.labelsByPageId ?? new Map<string, string>();
  const blocks: PageExportBlock[] = [
    { type: "heading", level: 1, text: title },
  ];

  const orderedLayouts = [...args.layouts].sort((a, b) => a.order - b.order);
  for (const layout of orderedLayouts) {
    const orderedSlots = [...layout.slots].sort(
      (a, b) => a.position - b.position,
    );

    for (const slot of orderedSlots) {
      for (const block of slot.blocks) {
        blocks.push(
          ...normalizeBlock(block.type, block.content, labelsByPageId),
        );
      }
    }
  }

  return {
    title,
    blocks,
  };
}

function createOrderedListConfig() {
  return {
    reference: NUMBERING_REFERENCE,
    levels: Array.from({ length: 8 }, (_, level) => ({
      level,
      format: LevelFormat.DECIMAL,
      text: `%${level + 1}.`,
      alignment: AlignmentType.START,
      style: {
        paragraph: {
          indent: {
            left: convertInchesToTwip(0.5 + level * 0.25),
            hanging: convertInchesToTwip(0.25),
          },
        },
      },
    })),
  };
}

function toHeadingLevel(level: number) {
  switch (level) {
    case 1:
      return HeadingLevel.HEADING_1;
    case 2:
      return HeadingLevel.HEADING_2;
    case 3:
      return HeadingLevel.HEADING_3;
    case 4:
      return HeadingLevel.HEADING_4;
    default:
      return HeadingLevel.HEADING_5;
  }
}

function createCodeParagraphs(text: string, language?: string): Paragraph[] {
  const lines = text.split("\n");
  const children: TextRun[] = [];

  lines.forEach((line, index) => {
    children.push(
      new TextRun({
        text: line,
        font: "Courier New",
        size: 22,
      }),
    );

    if (index < lines.length - 1) {
      children.push(
        new TextRun({
          text: "",
          break: 1,
          font: "Courier New",
        }),
      );
    }
  });

  const paragraphs = [];
  if (language) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: language.toUpperCase(),
            bold: true,
            size: 18,
          }),
        ],
        spacing: {
          before: 120,
          after: 40,
        },
      }),
    );
  }

  paragraphs.push(
    new Paragraph({
      children,
      spacing: {
        after: 200,
      },
    }),
  );

  return paragraphs;
}

function renderDocxNodes(blocks: PageExportBlock[]) {
  const children: Array<Paragraph | Table> = [];

  for (const block of blocks) {
    switch (block.type) {
      case "heading":
        children.push(
          new Paragraph({
            text: block.text,
            heading: toHeadingLevel(block.level),
            spacing: { after: 180 },
          }),
        );
        break;
      case "paragraph":
        children.push(
          new Paragraph({
            text: block.text,
            spacing: { after: 180 },
          }),
        );
        break;
      case "list-item":
        children.push(
          new Paragraph({
            text: block.text,
            ...(block.ordered
              ? {
                  numbering: {
                    reference: NUMBERING_REFERENCE,
                    level: clampListLevel(block.level),
                  },
                }
              : {
                  bullet: {
                    level: clampListLevel(block.level),
                  },
                }),
            spacing: { after: 80 },
          }),
        );
        break;
      case "task-item":
        children.push(
          new Paragraph({
            text: `${block.checked ? "[x]" : "[ ]"} ${block.text}`,
            bullet: {
              level: clampListLevel(block.level),
            },
            spacing: { after: 80 },
          }),
        );
        break;
      case "code":
        children.push(...createCodeParagraphs(block.text, block.language));
        break;
      case "table":
        children.push(
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              new TableRow({
                tableHeader: true,
                children: block.headers.map(
                  (header) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: header, bold: true })],
                        }),
                      ],
                    }),
                ),
              }),
              ...block.rows.map(
                (row) =>
                  new TableRow({
                    children: row.map(
                      (cell) =>
                        new TableCell({
                          children: [new Paragraph({ text: cell || " " })],
                        }),
                    ),
                  }),
              ),
            ],
          }),
        );
        children.push(new Paragraph({ text: "" }));
        break;
      case "unsupported":
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${block.label}: `,
                bold: true,
              }),
              new TextRun({
                text: block.text,
                italics: true,
              }),
            ],
            spacing: { after: 180 },
          }),
        );
        break;
    }
  }

  return children;
}

export async function renderPageExportDocx(
  document: PageExportDocument,
): Promise<Buffer> {
  const sections: ISectionOptions[] = [
    {
      properties: {},
      children: renderDocxNodes(document.blocks),
    },
  ];

  const doc = new Document({
    numbering: {
      config: [createOrderedListConfig()],
    },
    sections,
  });

  return await Packer.toBuffer(doc);
}

export function createPageExportFilename(args: {
  title: string;
  format: PageExportFormat;
}) {
  const safeTitle = args.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const baseName = safeTitle || "untitled-page";
  return `${baseName}.${args.format}`;
}
