import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

export type PageExportFormat = "docx";

interface SerializableLayout {
  order: number;
  slots: Array<{
    position: number;
    blocks: Array<{
      type: string;
      content: unknown;
    }>;
  }>;
}

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

function splitLines(value: string): string[] {
  const normalized = normalizeText(value);
  return normalized
    ? normalized
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : [];
}

function extractNestedText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => extractNestedText(item)).join(" ");
  }

  const record = asRecord(value);
  if (!record) {
    return "";
  }

  return [
    readString(record.text),
    readString(record.title),
    readString(record.header),
    extractNestedText(record.content),
    extractNestedText(record.children),
    extractNestedText(record.document),
  ]
    .filter(Boolean)
    .join(" ");
}

function extractDirectoryText(content: UnknownRecord): string[] {
  const columns = Array.isArray(content.columns)
    ? content.columns
        .map((column) => asRecord(column))
        .filter((column): column is UnknownRecord => column !== null)
    : [];

  const rows = Array.isArray(content.rows)
    ? content.rows
        .map((row) => asRecord(row))
        .filter((row): row is UnknownRecord => row !== null)
    : [];

  return rows
    .map((row) => {
      const cells = asRecord(row.cells) ?? {};
      return columns
        .map((column) => {
          const columnId = readString(column.id);
          return normalizeText(readString(cells[columnId]));
        })
        .filter(Boolean)
        .join(" - ");
    })
    .filter(Boolean);
}

function extractBlockText(type: string, content: unknown): string[] {
  const record = asRecord(content);
  if (!record) {
    return [];
  }

  if (type === "divider" || type === "block-spacer") {
    return [];
  }

  if (type === "directory") {
    return extractDirectoryText(record);
  }

  if (type === "richtext") {
    return splitLines(extractNestedText(record.document));
  }

  if (type === "page") {
    return splitLines(readString(record.title));
  }

  return splitLines(extractNestedText(record));
}

export function buildPageExportText(args: {
  pageTitle: string;
  layouts: SerializableLayout[];
}) {
  const title = normalizeText(args.pageTitle) || "Untitled page";
  const lines: string[] = [];

  const layouts = [...args.layouts].sort((a, b) => a.order - b.order);
  for (const layout of layouts) {
    const slots = [...layout.slots].sort((a, b) => a.position - b.position);

    for (const slot of slots) {
      for (const block of slot.blocks) {
        lines.push(...extractBlockText(block.type, block.content));
      }
    }
  }

  return { title, lines };
}

export async function renderPageExportDocx(document: {
  title: string;
  lines: string[];
}): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: document.title,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 240 },
          }),
          ...document.lines.map(
            (line) =>
              new Paragraph({
                children: [new TextRun(line)],
                spacing: { after: 160 },
              }),
          ),
        ],
      },
    ],
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

  return `${safeTitle || "untitled-page"}.${args.format}`;
}
