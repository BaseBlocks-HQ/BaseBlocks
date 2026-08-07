import {
  isOpenEditorDocument,
  type OpenEditorDocument,
} from "@openeditor/core";
import { HeadingLevel, Paragraph } from "docx";
import { renderOpenEditorDocx } from "./openeditor-docx";

export type PageExportFormat = "docx";

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

export async function renderPageExportDocx(document: {
  title: string;
  document: OpenEditorDocument;
}): Promise<Buffer> {
  return await renderOpenEditorDocx(document.document, {
    leadingChildren: [
      new Paragraph({
        heading: HeadingLevel.TITLE,
        spacing: { after: 240 },
        text: document.title,
      }),
    ],
    title: document.title,
  });
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
