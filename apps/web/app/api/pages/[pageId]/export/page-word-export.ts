import {
  isOpenEditorDocument,
  type OpenEditorDocument,
} from "@openeditor/core";
import { exportDocx } from "@openeditor/exporters/docx";
import { exportMarkdown } from "@openeditor/exporters/markdown";

export type PageExportFormat = "docx" | "markdown";

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
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

export async function renderPageExport(
  document: {
    title: string;
    document: OpenEditorDocument;
  },
  format: PageExportFormat,
) {
  const titledDocument: OpenEditorDocument = {
    ...document.document,
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: document.title }],
      },
      ...document.document.content,
    ],
  };

  return format === "docx"
    ? await exportDocx(titledDocument, { title: document.title })
    : await exportMarkdown(titledDocument);
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

  return `${safeTitle || "untitled-page"}.${args.format === "markdown" ? "md" : args.format}`;
}
