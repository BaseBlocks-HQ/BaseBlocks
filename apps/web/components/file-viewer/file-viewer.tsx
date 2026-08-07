"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Download01Icon,
  ArrowExpandIcon,
  ArrowShrinkIcon,
  LinkSquare01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@baseblocks/ui/lib/utils";
import { FileIcon, formatFileSize } from "@/components/file-viewer/file-ui";
import { Button } from "@baseblocks/ui/button";
import { Spinner } from "@baseblocks/ui/spinner";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { detectViewerFormat } from "@baseblocks/anydoc/react";

const AnyDocPreview = dynamic(() => import("./anydoc-preview-client"), {
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
  const [viewerToolbarTarget, setViewerToolbarTarget] =
    useState<HTMLDivElement | null>(null);

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
        fullscreen={fullscreen}
        leadingActions={leadingActions}
        onClose={onClose}
        onDownload={
          file.allowDownload !== false ? () => downloadFile(file) : undefined
        }
        onOpenExternal={() => window.open(file.url, "_blank", "noopener")}
        onToggleFullscreen={() => setFullscreen((value) => !value)}
        viewerToolbarRef={setViewerToolbarTarget}
      />
      <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        <FilePreviewContent
          file={file}
          viewerToolbarTarget={viewerToolbarTarget}
        />
      </main>
    </section>
  );

  return fullscreen ? createPortal(preview, document.body) : preview;
}

function PreviewToolbar({
  fullscreen,
  leadingActions,
  onClose,
  onDownload,
  onOpenExternal,
  onToggleFullscreen,
  viewerToolbarRef,
}: {
  fullscreen: boolean;
  leadingActions?: ReactNode;
  onClose: () => void;
  onDownload?: () => void;
  onOpenExternal: () => void;
  onToggleFullscreen: () => void;
  viewerToolbarRef: (node: HTMLDivElement | null) => void;
}) {
  const t = useTranslations("libraries.viewer");
  return (
    <header className="flex h-10 shrink-0 items-center gap-1 overflow-hidden border-b bg-muted px-2 text-foreground shadow-sm sm:gap-2">
      <div className="ml-auto flex min-w-0 max-w-full items-center justify-end gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {leadingActions}
        <div
          className="flex shrink-0 items-center gap-1"
          ref={viewerToolbarRef}
        />
        <ToolbarButton label={t("openNewTab")} onClick={onOpenExternal}>
          <HugeiconsIcon icon={LinkSquare01Icon} className="h-4 w-4" />
        </ToolbarButton>
        {onDownload ? (
          <ToolbarButton label={t("download")} onClick={onDownload}>
            <HugeiconsIcon icon={Download01Icon} className="h-4 w-4" />
          </ToolbarButton>
        ) : null}
        <ToolbarButton
          label={fullscreen ? t("exitFullscreen") : t("fullscreen")}
          onClick={onToggleFullscreen}
        >
          {fullscreen ? (
            <HugeiconsIcon icon={ArrowShrinkIcon} className="h-4 w-4" />
          ) : (
            <HugeiconsIcon icon={ArrowExpandIcon} className="h-4 w-4" />
          )}
        </ToolbarButton>
        <ToolbarButton label={t("close")} onClick={onClose}>
          <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
        </ToolbarButton>
      </div>
    </header>
  );
}

export const ToolbarButton = forwardRef<
  HTMLButtonElement,
  Omit<ComponentPropsWithoutRef<typeof Button>, "children"> & {
    children: ReactNode;
    label: string;
  }
>(function ToolbarButton({ children, className, label, ...props }, ref) {
  return (
    <Button
      {...props}
      ref={ref}
      type="button"
      aria-label={label}
      className={cn("text-muted-foreground", className)}
      size="icon-sm"
      title={label}
      variant="ghost"
    >
      {children}
    </Button>
  );
});

function FilePreviewContent({
  file,
  viewerToolbarTarget,
}: {
  file: PreviewFile;
  viewerToolbarTarget: HTMLDivElement | null;
}) {
  const t = useTranslations("libraries.viewer");
  if (
    detectViewerFormat({
      contentType: file.contentType,
      filename: file.filename,
      source: file.url,
    })
  ) {
    return (
      <AnyDocPreview
        file={file}
        messages={{
          loadError: t("documentLoadError"),
          loading: t("loadingDocument"),
          tooLarge: t("documentTooLarge"),
        }}
        toolbarTarget={viewerToolbarTarget}
      />
    );
  }

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
            <HugeiconsIcon icon={Download01Icon} className="mr-2 h-4 w-4" />
            {t("download")}
          </Button>
        ) : null}
        <Button
          variant="outline"
          onClick={() => window.open(file.url, "_blank", "noopener")}
        >
          <HugeiconsIcon icon={LinkSquare01Icon} className="mr-2 h-4 w-4" />
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
