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
import { useEffect, useMemo, useState } from "react";
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
  const messages = useMemo(
    () => ({ ...DEFAULT_MESSAGES, ...messageOverrides }),
    [messageOverrides],
  );
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; source: ArrayBuffer }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    if (!format) {
      setState({ message: messages.loadError, status: "error" });
      return () => controller.abort();
    }
    if (
      file.size !== undefined &&
      file.size > DEFAULT_DOCUMENT_PREVIEW_MAX_BYTES
    ) {
      setState({ message: messages.tooLarge, status: "error" });
      return () => controller.abort();
    }

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
  }, [file.size, file.url, format, messages.loadError, messages.tooLarge]);

  if (state.status === "loading") {
    return <PreviewStatus message={messages.loading} />;
  }
  if (state.status === "error") {
    return <PreviewError message={state.message} />;
  }
  if (!format) {
    return <PreviewError message={messages.loadError} />;
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
  const documentSource = useMemo(() => ({ data: source }), [source]);
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
