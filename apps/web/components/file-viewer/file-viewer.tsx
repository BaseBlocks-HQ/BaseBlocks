"use client";

import { cn } from "@baseblocks/ui/lib/utils";
import { FileIcon, formatFileSize } from "@/components/file-viewer/file-ui";
import { Button } from "@baseblocks/ui/button";
import { Spinner } from "@baseblocks/ui/spinner";
import { Download, ExternalLink, Maximize2, Minimize2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

const PdfPreview = dynamic(() => import("./pdf-preview-client"), {
  ssr: false,
  loading: () => <PreviewLoading />,
});

export interface PreviewFile {
  url: string;
  filename: string;
  contentType: string;
  size?: number;
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
          fullscreen && "fixed inset-0 z-[100]",
        )
      : cn(
          "fixed z-[100] flex flex-col border bg-background shadow-xl",
          fullscreen
            ? "inset-0"
            : "inset-x-3 bottom-3 top-3 sm:inset-x-auto sm:bottom-0 sm:right-0 sm:top-0 sm:w-[50vw] sm:min-w-[400px] sm:max-w-[800px] sm:border-l",
        );

  const preview = (
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

  return fullscreen ? createPortal(preview, document.body) : preview;
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
  const t = useTranslations("libraries.viewer");
  return (
    <header className="flex h-10 shrink-0 items-center gap-2 border-b bg-muted px-2 text-foreground shadow-sm">
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
      <ToolbarButton label={t("openNewTab")} onClick={onOpenExternal}>
        <ExternalLink className="h-4 w-4" />
      </ToolbarButton>
      {onDownload ? (
        <ToolbarButton label={t("download")} onClick={onDownload}>
          <Download className="h-4 w-4" />
        </ToolbarButton>
      ) : null}
      <ToolbarButton
        label={fullscreen ? t("exitFullscreen") : t("fullscreen")}
        onClick={onToggleFullscreen}
      >
        {fullscreen ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        )}
      </ToolbarButton>
      <ToolbarButton label={t("close")} onClick={onClose}>
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
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary focus-visible:bg-primary/5 focus-visible:text-primary focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40",
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

  return <UnknownPreview file={file} />;
}

function UnknownPreview({ file }: { file: PreviewFile }) {
  const t = useTranslations("libraries.viewer");
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
        {t("previewUnavailable")}
      </p>
      <div className="mt-6 flex items-center gap-2">
        {file.allowDownload !== false ? (
          <Button onClick={() => downloadFile(file)}>
            <Download className="mr-2 h-4 w-4" />
            {t("download")}
          </Button>
        ) : null}
        <Button
          variant="outline"
          onClick={() => window.open(file.url, "_blank", "noopener")}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          {t("open")}
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
