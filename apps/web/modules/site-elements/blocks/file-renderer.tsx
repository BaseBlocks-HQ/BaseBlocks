"use client";

import {
  FILE_SEARCH_PARAM,
  buildFileDeepLinkPath,
  toAbsoluteBrowserUrl,
} from "@/lib/file-deep-link";
import { cn } from "@/lib/utils";
import {
  FilePreview as FilePreviewPanel,
  type PreviewFile,
} from "@/modules/file-preview";
import { FileIcon, getFileTypeColor } from "@/modules/file-ui";
import { useSiteRenderActions } from "@/modules/site-runtime/actions";
import type { ElementRendererProps } from "@/modules/site-runtime/registry";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { Eye, Link as LinkIcon, MoreHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

interface FileData {
  _id: string;
  filename: string;
  contentType: string;
  size: number;
  createdAt?: number;
  downloadUrl: string;
}

function getDocumentUrl(documentId: string) {
  return `/api/storage/documents/${documentId}`;
}

function getContentSnapshot(
  content: ElementRendererProps<"file">["content"],
): FileData | null {
  if (
    !content.documentId ||
    !content.filename ||
    !content.contentType ||
    typeof content.size !== "number"
  ) {
    return null;
  }

  return {
    _id: content.documentId,
    filename: content.filename,
    contentType: content.contentType,
    size: content.size,
    createdAt: content.createdAt,
    downloadUrl: getDocumentUrl(content.documentId),
  };
}

function toPreviewFile(file: FileData, deepLinkId?: string): PreviewFile {
  return {
    url: file.downloadUrl,
    filename: file.filename,
    contentType: file.contentType,
    size: file.size,
    deepLinkId,
  };
}

function formatFileMeta(file: Pick<FileData, "size" | "createdAt">) {
  const parts = [formatFileSize(file.size)];
  if (file.createdAt) {
    parts.push(
      new Date(file.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    );
  }
  return parts.join(" • ");
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  return `${Number.parseFloat((bytes / 1024 ** index).toFixed(1))} ${units[index]}`;
}

function FileItemMenu({
  onCopyLink,
  onOpen,
}: {
  onCopyLink?: () => void;
  onOpen?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {onOpen ? (
          <DropdownMenuItem onClick={onOpen}>
            <Eye className="mr-2 h-4 w-4" />
            Open
          </DropdownMenuItem>
        ) : null}
        {onCopyLink ? (
          <DropdownMenuItem onClick={onCopyLink}>
            <LinkIcon className="mr-2 h-4 w-4" />
            Copy link
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SingleFileRow({
  actions,
  file,
  onOpen,
}: {
  actions?: ReactNode;
  file: FileData;
  onOpen?: () => void;
}) {
  return (
    <div className="group grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border bg-card/70 p-1.5">
      <button
        type="button"
        onClick={onOpen}
        className="grid min-w-0 grid-cols-[32px_minmax(0,1fr)] items-center gap-2.5 text-left"
      >
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md bg-muted/70",
            getFileTypeColor(file.contentType),
          )}
        >
          <FileIcon contentType={file.contentType} className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium leading-tight">
            {file.filename}
          </span>
          <span className="mt-0.5 block truncate text-[11px] leading-tight text-muted-foreground/80 tabular-nums">
            {formatFileMeta(file)}
          </span>
        </span>
      </button>
      {actions}
    </div>
  );
}

export function FileRenderer({ content }: ElementRendererProps<"file">) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const actions = useSiteRenderActions();
  const hasFileDeepLinks = actions.fileDeepLinks === true;
  const file = getContentSnapshot(content);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const openedFromLinkRef = useRef<string | null>(null);
  const selectedFileId = searchParams.get(FILE_SEARCH_PARAM);

  const closePreview = useCallback(() => {
    if (previewFile?.deepLinkId) {
      const nextUrl = buildFileDeepLinkPath(
        pathname,
        searchParams.toString(),
        null,
      );
      router.replace(nextUrl, { scroll: false });
    }
    setPreviewFile(null);
  }, [pathname, previewFile?.deepLinkId, router, searchParams]);

  useEffect(() => {
    if (!file) return;
    if (!hasFileDeepLinks) return;
    if (selectedFileId !== file._id) return;
    if (openedFromLinkRef.current === selectedFileId) return;

    setPreviewFile(toPreviewFile(file, file._id));
    openedFromLinkRef.current = selectedFileId;
  }, [file, hasFileDeepLinks, selectedFileId]);

  if (!file) {
    return null;
  }

  const handleOpen = () => {
    if (hasFileDeepLinks) {
      const nextUrl = buildFileDeepLinkPath(
        pathname,
        searchParams.toString(),
        file._id,
      );
      router.replace(nextUrl, { scroll: false });
    }

    setPreviewFile(
      toPreviewFile(file, hasFileDeepLinks ? file._id : undefined),
    );
  };

  const handleCopyLink = async () => {
    const sharePath = buildFileDeepLinkPath(
      pathname,
      searchParams.toString(),
      file._id,
    );
    await navigator.clipboard.writeText(toAbsoluteBrowserUrl(sharePath));
    toast.success("Link copied");
  };

  return (
    <>
      <SingleFileRow
        file={file}
        onOpen={handleOpen}
        actions={
          <FileItemMenu
            onOpen={handleOpen}
            onCopyLink={() => void handleCopyLink()}
          />
        }
      />
      <FilePreviewPanel file={previewFile} onClose={closePreview} />
    </>
  );
}
