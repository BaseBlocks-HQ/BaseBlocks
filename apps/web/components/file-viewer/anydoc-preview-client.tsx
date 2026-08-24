"use client";

import type { PreviewFile } from "@/components/file-viewer/file-viewer";
import { isSafeExternalUrl } from "@baseblocks/anydoc-contracts";
import {
  AnyDocumentViewer,
  type ViewerControls,
  type ViewerError,
} from "@baseblocks/anydoc-viewer/react";
import { Spinner } from "@baseblocks/ui/spinner";
import { useMemo } from "react";
import { UnifiedViewerControls } from "./anydoc-viewer-controls";

export const DEFAULT_DOCUMENT_PREVIEW_MAX_BYTES = 100 * 1024 * 1024;

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
  toolbarTarget,
}: {
  file: PreviewFile;
  messages?: Partial<AnyDocPreviewMessages>;
  toolbarTarget: HTMLDivElement | null;
}) {
  const messages: AnyDocPreviewMessages = {
    loadError: messageOverrides?.loadError ?? DEFAULT_MESSAGES.loadError,
    loading: messageOverrides?.loading ?? DEFAULT_MESSAGES.loading,
    tooLarge: messageOverrides?.tooLarge ?? DEFAULT_MESSAGES.tooLarge,
  };
  const source = useMemo(
    () => ({ credentials: "same-origin" as const, url: file.url }),
    [file.url],
  );
  const controls = useMemo(
    () => ({
      render: (value: ViewerControls) =>
        toolbarTarget ? <UnifiedViewerControls controls={value} /> : null,
      target: toolbarTarget,
      transform: (value: ViewerControls): ViewerControls => ({
        ...value,
        // The BaseBlocks shell owns fullscreen across every file type.
        actions: value.actions.filter((action) => action.id !== "fullscreen"),
      }),
    }),
    [toolbarTarget],
  );

  if (
    file.size !== undefined &&
    file.size > DEFAULT_DOCUMENT_PREVIEW_MAX_BYTES
  ) {
    return <PreviewError message={messages.tooLarge} />;
  }

  return (
    <AnyDocumentViewer
      className="baseblocks-anydoc-preview h-full min-h-0"
      contentType={file.contentType}
      controls={controls}
      error={(error: ViewerError) => (
        <PreviewError
          message={
            error.code === "too-large" ? messages.tooLarge : messages.loadError
          }
        />
      )}
      filename={file.filename}
      loading={<PreviewStatus message={messages.loading} />}
      maxBytes={DEFAULT_DOCUMENT_PREVIEW_MAX_BYTES}
      source={source}
      title={file.filename}
      viewerOptions={{
        presentation: {
          onLink: (link) => {
            if (isSafeExternalUrl(link.url)) {
              window.open(link.url, "_blank", "noopener,noreferrer");
            }
          },
        },
      }}
    />
  );
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
