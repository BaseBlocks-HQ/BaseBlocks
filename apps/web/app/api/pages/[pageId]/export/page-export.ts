import {
  isOpenEditorDocument,
  type OpenEditorDocument,
} from "@openeditor/core";
import {
  createOpenEditorExporterRegistry,
  openEditorBuiltInExporters,
  type OpenEditorAssetResolver,
  type OpenEditorExportResult,
} from "@openeditor/exporters";
import { packageOpenEditorExportResult } from "@openeditor/exporters/bundle";
import { docxExporter } from "@openeditor/exporters/docx";
import { markdownExporter } from "@openeditor/exporters/markdown";

export const PAGE_EXPORT_FORMATS = [
  "docx",
  "markdown",
  "html",
  "text",
  "json",
] as const;

export type PageExportFormat = (typeof PAGE_EXPORT_FORMATS)[number];

export type PageExportAsset = {
  fileId: string;
  filename: string;
  contentType: string;
  objectKey: string;
  size: number;
  checksum?: string;
};

const pageExporterRegistry = createOpenEditorExporterRegistry({
  exporters: [...openEditorBuiltInExporters, markdownExporter, docxExporter],
});

const ASSET_FAILURE_CODES = new Set([
  "asset_rejected",
  "asset_unavailable",
  "unsafe_url",
]);

export class PageExportAssetError extends Error {
  constructor() {
    super("One or more page images could not be exported safely.");
    this.name = "PageExportAssetError";
  }
}

function normalizeEtag(value: string): string {
  return value.trim().replace(/^W\//u, "").replace(/^"|"$/gu, "");
}

export function assertStoredChecksum(
  expected: string | undefined,
  actualEtag: string | undefined,
): void {
  if (!expected || /^[a-f\d]{64}$/iu.test(expected)) return;
  if (!actualEtag || normalizeEtag(actualEtag) !== normalizeEtag(expected)) {
    throw new Error("Stored file checksum does not match its release snapshot");
  }
}

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

export function createPageExportAssetResolver(
  assets: readonly PageExportAsset[],
  load: (asset: PageExportAsset, signal?: AbortSignal) => Promise<Uint8Array>,
): OpenEditorAssetResolver {
  const byId = new Map(assets.map((asset) => [asset.fileId, asset]));
  const loads = new Map<string, Promise<Uint8Array>>();
  return async (node, { signal }) => {
    const imageId =
      node.type === "image" && typeof node.attrs?.imageId === "string"
        ? node.attrs.imageId
        : null;
    const asset = imageId ? byId.get(imageId) : undefined;
    if (!asset) return null;
    let pending = loads.get(asset.fileId);
    if (!pending) {
      pending = load(asset, signal);
      loads.set(asset.fileId, pending);
    }
    const data = await pending;
    signal?.throwIfAborted();
    return {
      data,
      fileName: asset.filename,
      height:
        typeof node.attrs?.height === "number" ? node.attrs.height : undefined,
      mediaType: asset.contentType,
      width:
        typeof node.attrs?.width === "number" ? node.attrs.width : undefined,
    };
  };
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
  options: {
    assetResolver?: OpenEditorAssetResolver;
    signal?: AbortSignal;
  } = {},
) {
  const document = withTitle(input);
  let exported: OpenEditorExportResult;
  if (format === "docx") {
    exported = await pageExporterRegistry.export(document, "docx", {
      assetResolver: options.assetResolver,
      signal: options.signal,
      title: input.title,
    });
  } else if (format === "markdown") {
    exported = await pageExporterRegistry.export(document, "markdown", {
      assetResolver: options.assetResolver,
      signal: options.signal,
    });
  } else if (format === "html") {
    exported = await pageExporterRegistry.export(document, "html", {
      assetResolver: options.assetResolver,
      signal: options.signal,
    });
  } else if (format === "json") {
    exported = await pageExporterRegistry.export(document, "json");
  } else {
    exported = await pageExporterRegistry.export(document, "text");
  }

  if (
    exported.warnings.some((warning) => ASSET_FAILURE_CODES.has(warning.code))
  ) {
    throw new PageExportAssetError();
  }
  return await packageOpenEditorExportResult(exported, {
    baseFileName: input.title,
    signal: options.signal,
  });
}

export function createPageExportFilename(args: {
  extension: string;
  title: string;
}) {
  const safeTitle = args.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const extension = args.extension.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${safeTitle || "untitled-page"}.${extension || "bin"}`;
}
