"use client";

import { cn } from "@/lib/utils";
import { FileIcon } from "@/modules/file-ui";
import { Button } from "@baseblocks/ui/button";
import { Spinner } from "@baseblocks/ui/spinner";
import { Download, ExternalLink, Maximize2, Minimize2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { type ReactNode, useEffect, useRef, useState } from "react";

const PdfPreview = dynamic(() => import("./pdf-preview-client"), {
  ssr: false,
  loading: () => <PreviewLoading />,
});

export interface PreviewFile {
  url: string;
  filename: string;
  contentType: string;
  size?: number;
  deepLinkId?: string;
  searchTerm?: string;
  allowDownload?: boolean;
}

type FilePreviewMode = "panel" | "embedded";

export function FilePreview({
  file,
  leadingActions,
  mode = "panel",
  onClose,
}: {
  file: PreviewFile | null;
  leadingActions?: ReactNode;
  mode?: FilePreviewMode;
  onClose: () => void;
}) {
  const [fullscreen, setFullscreen] = useState(false);

  const fileUrl = file?.url;

  useEffect(() => {
    if (fileUrl) setFullscreen(false);
  }, [fileUrl]);

  useEffect(() => {
    if (!file) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (fullscreen) {
        setFullscreen(false);
        return;
      }
      onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [file, fullscreen, onClose]);

  if (!file) return null;

  const downloadEnabled = file.allowDownload !== false;
  const shellClassName =
    mode === "embedded"
      ? cn(
          "relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-card",
          fullscreen && "fixed inset-0 z-50",
        )
      : cn(
          "fixed z-50 flex flex-col border bg-background shadow-xl",
          fullscreen
            ? "inset-0"
            : "inset-x-3 bottom-3 top-3 sm:inset-x-auto sm:bottom-0 sm:right-0 sm:top-0 sm:w-[50vw] sm:min-w-[400px] sm:max-w-[800px] sm:border-l",
        );

  return (
    <section className={shellClassName}>
      <PreviewToolbar
        file={file}
        fullscreen={fullscreen}
        leadingActions={leadingActions}
        onClose={onClose}
        onDownload={downloadEnabled ? () => downloadFile(file) : undefined}
        onOpenExternal={() => window.open(file.url, "_blank", "noopener")}
        onToggleFullscreen={() => setFullscreen((value) => !value)}
      />
      <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        <FilePreviewContent file={file} />
      </main>
    </section>
  );
}

function PreviewToolbar({
  file,
  fullscreen,
  leadingActions,
  onClose,
  onDownload,
  onOpenExternal,
  onToggleFullscreen,
}: {
  file: PreviewFile;
  fullscreen: boolean;
  leadingActions?: ReactNode;
  onClose: () => void;
  onDownload?: () => void;
  onOpenExternal: () => void;
  onToggleFullscreen: () => void;
}) {
  return (
    <header className="flex h-10 shrink-0 items-center gap-2 border-b bg-background/95 px-2">
      {leadingActions}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <FileIcon
          className="h-4 w-4 shrink-0 text-muted-foreground"
          contentType={file.contentType}
        />
        <span className="truncate text-sm font-medium" title={file.filename}>
          {file.filename}
        </span>
        {file.size ? (
          <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
            {formatFileSize(file.size)}
          </span>
        ) : null}
      </div>
      <ToolbarButton label="Open in new tab" onClick={onOpenExternal}>
        <ExternalLink className="h-4 w-4" />
      </ToolbarButton>
      {onDownload ? (
        <ToolbarButton label="Download" onClick={onDownload}>
          <Download className="h-4 w-4" />
        </ToolbarButton>
      ) : null}
      <ToolbarButton
        label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        onClick={onToggleFullscreen}
      >
        {fullscreen ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        )}
      </ToolbarButton>
      <ToolbarButton label="Close" onClick={onClose}>
        <X className="h-4 w-4" />
      </ToolbarButton>
    </header>
  );
}

export function ToolbarButton({
  children,
  className,
  disabled,
  label,
  onClick,
  pressed,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary focus-visible:bg-primary/5 focus-visible:text-primary focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40",
        pressed && "bg-primary/10 text-primary",
        className,
      )}
      disabled={disabled}
      onClick={onClick}
      title={label}
    >
      {children}
    </button>
  );
}

function FilePreviewContent({ file }: { file: PreviewFile }) {
  const contentType = file.contentType.toLowerCase();

  if (contentType.includes("pdf")) return <PdfPreview file={file} />;

  if (contentType.startsWith("image/")) {
    return (
      <div className="grid h-full min-h-0 place-items-center overflow-auto bg-muted/20 p-4">
        {/* biome-ignore lint/performance/noImgElement: File previews render arbitrary user files that Next Image cannot optimize safely. */}
        <img
          alt={file.filename}
          className="block max-h-full max-w-full select-none rounded-sm object-contain shadow-sm outline outline-1 outline-border/50"
          draggable={false}
          src={file.url}
        />
      </div>
    );
  }

  if (contentType.startsWith("video/")) {
    return (
      <div className="grid h-full min-h-0 place-items-center bg-black">
        <video
          className="max-h-full max-w-full"
          controls
          playsInline
          src={file.url}
        >
          <track
            kind="captions"
            src="data:text/vtt,WEBVTT"
            srcLang="en"
            label="Captions"
          />
        </video>
      </div>
    );
  }

  if (contentType.startsWith("audio/")) {
    return (
      <div className="grid h-full min-h-0 place-items-center bg-muted/20 p-8">
        <audio className="w-full max-w-md" controls src={file.url}>
          <track
            kind="captions"
            src="data:text/vtt,WEBVTT"
            srcLang="en"
            label="Captions"
          />
        </audio>
      </div>
    );
  }

  if (
    contentType.startsWith("text/") ||
    contentType.includes("json") ||
    contentType.includes("xml") ||
    contentType.includes("javascript") ||
    contentType.includes("typescript")
  ) {
    return <TextPreview file={file} />;
  }

  return <UnknownPreview file={file} />;
}

function TextPreview({ file }: { file: PreviewFile }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setContent(null);
    setError(null);

    fetch(file.url)
      .then((response) => {
        if (!response.ok)
          throw new Error(`Failed to load file (${response.status})`);
        return response.text();
      })
      .then((text) => {
        if (!cancelled) setContent(text);
      })
      .catch((nextError: unknown) => {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : "Failed to load text file",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [file.url]);

  if (error) return <PreviewError message={error} />;
  if (content == null) return <PreviewLoading />;

  return (
    <div className="h-full min-h-0 overflow-auto bg-muted/20 p-4">
      <pre className="min-h-full whitespace-pre-wrap break-words font-mono text-sm">
        {content}
      </pre>
    </div>
  );
}

function UnknownPreview({ file }: { file: PreviewFile }) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center p-8 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
        <FileIcon
          className="h-10 w-10 text-muted-foreground"
          contentType={file.contentType}
        />
      </div>
      <h3 className="mb-2 max-w-md truncate text-lg font-medium">
        {file.filename}
      </h3>
      <p className="mb-1 text-sm text-muted-foreground">{file.contentType}</p>
      <p className="mb-6 text-sm text-muted-foreground">
        {formatFileSize(file.size)}
      </p>
      <p className="max-w-md text-sm text-muted-foreground">
        This file type cannot be previewed in the browser.
      </p>
      <div className="mt-6 flex items-center gap-2">
        {file.allowDownload !== false ? (
          <Button onClick={() => downloadFile(file)}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        ) : null}
        <Button
          variant="outline"
          onClick={() => window.open(file.url, "_blank", "noopener")}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Open
        </Button>
      </div>
    </div>
  );
}

function PreviewLoading() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center">
      <Spinner className="size-5 text-muted-foreground" />
    </div>
  );
}

function PreviewError({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center p-6 text-center text-sm text-destructive">
      {message}
    </div>
  );
}

function downloadFile(file: PreviewFile) {
  const link = document.createElement("a");
  link.href = file.url;
  link.download = file.filename;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
