import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

export type PageExportFormat = "docx";

interface SerializablePageStructure {
  document: unknown;
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
    extractNestedText(record.attrs),
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildPageExportText(args: {
  pageTitle: string;
  structure: SerializablePageStructure;
}) {
  const title = normalizeText(args.pageTitle) || "Untitled page";
  const lines = splitLines(extractNestedText(args.structure.document));

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
