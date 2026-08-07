import {
  isOpenEditorDocument,
  type OpenEditorDocument,
} from "@openeditor/core";
import { toHtml, toJson, toPlainText } from "@openeditor/exporters";
import { exportDocx } from "@openeditor/exporters/docx";
import { exportMarkdown } from "@openeditor/exporters/markdown";

export const PAGE_EXPORT_FORMATS = [
  "docx",
  "markdown",
  "html",
  "text",
  "json",
] as const;

export type PageExportFormat = (typeof PAGE_EXPORT_FORMATS)[number];

const formatMetadata = {
  html: { extension: "html", mediaType: "text/html; charset=utf-8" },
  json: { extension: "json", mediaType: "application/json" },
  text: { extension: "txt", mediaType: "text/plain; charset=utf-8" },
} as const;

const formatExtensions: Record<PageExportFormat, string> = {
  docx: "docx",
  html: "html",
  json: "json",
  markdown: "md",
  text: "txt",
};

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

export function isPageExportFormat(
  value: string | null,
): value is PageExportFormat {
  return PAGE_EXPORT_FORMATS.some((format) => format === value);
}

export function buildPageExportDocument(args: {
  pageTitle: string;
  content: unknown;
}): { title: string; document: OpenEditorDocument } {
  const title = normalizeText(args.pageTitle) || "Untitled page";
  if (!isOpenEditorDocument(args.content)) {
    throw new TypeError("Page content is not a valid OpenEditor document");
  }

  return { title, document: args.content };
}

function withTitle(input: {
  title: string;
  document: OpenEditorDocument;
}): OpenEditorDocument {
  return {
    ...input.document,
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: input.title }],
      },
      ...input.document.content,
    ],
  };
}

export async function renderPageExport(
  input: { title: string; document: OpenEditorDocument },
  format: PageExportFormat,
) {
  const document = withTitle(input);
  if (format === "docx")
    return await exportDocx(document, { title: input.title });
  if (format === "markdown") return await exportMarkdown(document);

  const metadata = formatMetadata[format];
  const data =
    format === "html"
      ? toHtml(document)
      : format === "json"
        ? toJson(document)
        : toPlainText(document);
  return {
    binary: false as const,
    data,
    extension: metadata.extension,
    files: [],
    format,
    mediaType: metadata.mediaType,
    warnings: [],
  };
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
  return `${safeTitle || "untitled-page"}.${formatExtensions[args.format]}`;
}
