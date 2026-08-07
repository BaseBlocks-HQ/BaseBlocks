"use client";

import type { PreviewFile } from "@/components/file-viewer/file-viewer";
import { isSafeExternalUrl } from "@baseblocks/anydoc";
import type {
  DocxViewerProps,
  MarkdownViewerProps,
  PdfViewerProps,
  TextViewerProps,
} from "@baseblocks/anydoc/react";
import { Spinner } from "@baseblocks/ui/spinner";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  DEFAULT_DOCUMENT_PREVIEW_MAX_BYTES,
  DocumentPreviewTooLargeError,
  loadBoundedDocument,
  type NativeDocumentFormat,
  resolveNativeDocumentFormat,
} from "./anydoc-preview";

const PdfViewer = dynamic<PdfViewerProps>(
  () => import("@baseblocks/anydoc/react").then((module) => module.PdfViewer),
  {
    loading: () => <PreviewStatus message={DEFAULT_MESSAGES.loading} />,
    ssr: false,
  },
);
const DocxViewer = dynamic<DocxViewerProps>(
  () => import("@baseblocks/anydoc/react").then((module) => module.DocxViewer),
  {
    loading: () => <PreviewStatus message={DEFAULT_MESSAGES.loading} />,
    ssr: false,
  },
);
const TextViewer = dynamic<TextViewerProps>(
  () => import("@baseblocks/anydoc/react").then((module) => module.TextViewer),
  {
    loading: () => <PreviewStatus message={DEFAULT_MESSAGES.loading} />,
    ssr: false,
  },
);
const MarkdownViewer = dynamic<MarkdownViewerProps>(
  () =>
    import("@baseblocks/anydoc/react").then((module) => module.MarkdownViewer),
  {
    loading: () => <PreviewStatus message={DEFAULT_MESSAGES.loading} />,
    ssr: false,
  },
);
const PresentationViewer = dynamic(
  () =>
    import("@baseblocks/anydoc/presentation").then(
      (module) => module.PresentationViewer,
    ),
  {
    loading: () => <PreviewStatus message={DEFAULT_MESSAGES.loading} />,
    ssr: false,
  },
);
const SpreadsheetViewer = dynamic(
  () =>
    import("@baseblocks/anydoc/spreadsheet").then(
      (module) => module.SpreadsheetViewer,
    ),
  {
    loading: () => <PreviewStatus message={DEFAULT_MESSAGES.loading} />,
    ssr: false,
  },
);

const documentSources = new WeakMap<ArrayBuffer, { data: ArrayBuffer }>();

export function getStableDocumentSource(source: ArrayBuffer): {
  data: ArrayBuffer;
} {
  const existing = documentSources.get(source);
  if (existing) return existing;

  const documentSource = { data: source };
  documentSources.set(source, documentSource);
  return documentSource;
}

export type AnyDocPreviewMessages = {
  loadError: string;
  loading: string;
  tooLarge: string;
};

const DEFAULT_MESSAGES: AnyDocPreviewMessages = {
  loadError: "The document could not be loaded.",
  loading: "Loading document",
  tooLarge: "This document is too large to preview.",
};

export default function AnyDocPreview({
  file,
  messages: messageOverrides,
}: {
  file: PreviewFile;
  messages?: Partial<AnyDocPreviewMessages>;
}) {
  const format = resolveNativeDocumentFormat(file);
  const messages: AnyDocPreviewMessages = {
    loadError: messageOverrides?.loadError ?? DEFAULT_MESSAGES.loadError,
    loading: messageOverrides?.loading ?? DEFAULT_MESSAGES.loading,
    tooLarge: messageOverrides?.tooLarge ?? DEFAULT_MESSAGES.tooLarge,
  };

  if (!format) {
    return <PreviewError message={messages.loadError} />;
  }
  if (
    file.size !== undefined &&
    file.size > DEFAULT_DOCUMENT_PREVIEW_MAX_BYTES
  ) {
    return <PreviewError message={messages.tooLarge} />;
  }

  return (
    <DocumentLoadSession
      file={file}
      format={format}
      key={`${file.url}:${file.size ?? "unknown"}:${format}`}
      messages={messages}
    />
  );
}

function DocumentLoadSession({
  file,
  format,
  messages,
}: {
  file: PreviewFile;
  format: NativeDocumentFormat;
  messages: AnyDocPreviewMessages;
}) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; source: ArrayBuffer }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    void loadBoundedDocument(file.url, {
      maxBytes: DEFAULT_DOCUMENT_PREVIEW_MAX_BYTES,
      signal: controller.signal,
    })
      .then((source) => setState({ source, status: "ready" }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          message:
            error instanceof DocumentPreviewTooLargeError
              ? messages.tooLarge
              : messages.loadError,
          status: "error",
        });
      });
    return () => controller.abort();
  }, [file.url, messages.loadError, messages.tooLarge]);

  if (state.status === "loading") {
    return <PreviewStatus message={messages.loading} />;
  }
  if (state.status === "error") {
    return <PreviewError message={state.message} />;
  }
  return (
    <NativeDocumentViewer
      filename={file.filename}
      format={format}
      source={state.source}
    />
  );
}

function NativeDocumentViewer({
  filename,
  format,
  source,
}: {
  filename: string;
  format: NativeDocumentFormat;
  source: ArrayBuffer;
}) {
  const documentSource = getStableDocumentSource(source);
  if (format === "pdf") {
    return (
      <PdfViewer
        className="h-full min-h-0"
        maxBytes={DEFAULT_DOCUMENT_PREVIEW_MAX_BYTES}
        source={documentSource}
        title={filename}
      />
    );
  }
  if (format === "docx") {
    return (
      <DocxViewer
        className="h-full min-h-0"
        maxBytes={DEFAULT_DOCUMENT_PREVIEW_MAX_BYTES}
        source={documentSource}
        title={filename}
      />
    );
  }
  if (format === "markdown") {
    return (
      <MarkdownViewer
        className="h-full min-h-0"
        maxBytes={DEFAULT_DOCUMENT_PREVIEW_MAX_BYTES}
        source={documentSource}
        title={filename}
      />
    );
  }
  if (format === "text") {
    return (
      <TextViewer
        className="h-full min-h-0"
        maxBytes={DEFAULT_DOCUMENT_PREVIEW_MAX_BYTES}
        source={documentSource}
        title={filename}
      />
    );
  }
  if (format === "pptx") {
    return (
      <PresentationViewer
        onLink={(link) => {
          if (isSafeExternalUrl(link.url)) {
            window.open(link.url, "_blank", "noopener,noreferrer");
          }
        }}
        source={source}
      />
    );
  }
  return <SpreadsheetViewer format={format} source={source} />;
}

function PreviewStatus({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center" role="status">
      <Spinner aria-hidden="true" className="size-5 text-muted-foreground" />
      <span className="sr-only">{message}</span>
    </div>
  );
}

function PreviewError({ message }: { message: string }) {
  return (
    <div
      className="flex h-full items-center justify-center p-6 text-center text-sm text-destructive"
      role="alert"
    >
      {message}
    </div>
  );
}
