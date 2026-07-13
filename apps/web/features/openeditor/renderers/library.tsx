"use client";

import {
  FilePreview,
  type PreviewFile,
} from "@/components/file-viewer/file-viewer";
import {
  LIBRARY_FILE_SEARCH_PARAM,
  buildLibraryExplorerModel,
  buildLibraryFilePath,
  type FileId,
  type LibraryExplorerPayload,
} from "@/features/libraries/model";
import { api, type Id } from "@baseblocks/backend";
import type { LibraryContent } from "@baseblocks/domain";
import { cn } from "@baseblocks/ui/lib/utils";
import { Spinner } from "@baseblocks/ui/spinner";
import { useQuery } from "convex/react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  File,
  Folder,
  Link,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function readLibrary(value: unknown): LibraryContent {
  const candidate =
    value && typeof value === "object" ? (value as LibraryContent) : {};
  return {
    libraryId: candidate.libraryId,
    allowDownloads: candidate.allowDownloads ?? true,
  };
}

export function PublicLibraryViewer({ value }: { value: LibraryContent }) {
  const libraryId = value.libraryId as Id<"documentLibraries"> | undefined;
  const explorer = useQuery(
    api.libraries.getPublicExplorer,
    libraryId ? { libraryId } : "skip",
  );
  if (!libraryId) return null;
  return (
    <ReadOnlyLibraryExplorer
      allowDownloads={value.allowDownloads !== false}
      explorer={explorer}
    />
  );
}

export function ReadOnlyLibraryExplorer({
  allowDownloads,
  className,
  explorer,
}: {
  allowDownloads: boolean;
  className?: string;
  explorer: LibraryExplorerPayload | null | undefined;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const model = buildLibraryExplorerModel(
    explorer?.folders ?? [],
    explorer?.files ?? [],
  );
  useEffect(() => {
    setExpanded(
      new Set(
        model.nodes
          .filter((node) => node.data.kind === "folder")
          .map((node) => node.id),
      ),
    );
  }, [model.nodes]);
  useEffect(() => {
    const selectedId = searchParams.get(
      LIBRARY_FILE_SEARCH_PARAM,
    ) as FileId | null;
    if (!selectedId) return;
    const entity = model.entityByFileId.get(selectedId);
    if (entity?.kind !== "file") return;
    setPreviewFile({
      url: entity.file.downloadUrl,
      filename: entity.file.filename,
      contentType: entity.file.contentType,
      size: entity.file.size,
      allowDownload: allowDownloads,
    });
  }, [allowDownloads, model.entityByFileId, searchParams]);
  const visibleNodes = (() => {
    const result: Array<(typeof model.nodes)[number] & { depth: number }> = [];
    const visit = (parentId: string | undefined, depth: number) => {
      for (const node of model.nodes.filter(
        (candidate) => candidate.parentId === parentId,
      )) {
        result.push({ ...node, depth });
        if (node.data.kind === "folder" && expanded.has(node.id))
          visit(node.id, depth + 1);
      }
    };
    visit(undefined, 0);
    return result;
  })();

  if (explorer === undefined) {
    return (
      <div className="flex min-h-[28rem] items-center justify-center rounded-2xl bg-card">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }
  if (!explorer) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-2xl bg-card text-sm text-muted-foreground">
        Library not found
      </div>
    );
  }

  const filePath = (documentId: string | null) =>
    buildLibraryFilePath(pathname, searchParams.toString(), documentId);

  return (
    <section
      className={cn(
        "not-prose my-4 flex h-[32rem] min-h-[28rem] min-w-0 overflow-hidden rounded-2xl bg-card",
        className,
      )}
    >
      <div
        className={cn(
          "min-w-0 flex-1",
          previewFile && "hidden border-r md:block md:max-w-[36%]",
        )}
      >
        <div className="flex h-10 items-center px-3 text-xs font-medium">
          {explorer.library.name}
        </div>
        <div
          className="h-[calc(100%-2.5rem)] overflow-auto px-1 pb-2"
          role="tree"
        >
          {visibleNodes.map((node) => {
            const folder = node.data.kind === "folder";
            const file = node.data.kind === "file" ? node.data.file : null;
            const isExpanded = expanded.has(node.id);
            return (
              <div
                aria-expanded={folder ? isExpanded : undefined}
                aria-level={node.depth + 1}
                className="group flex h-8 items-center gap-1 rounded-md px-1 hover:bg-accent"
                key={node.id}
                role="treeitem"
                style={{ paddingLeft: node.depth * 16 + 4 }}
                tabIndex={0}
              >
                {folder ? (
                  <button
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                    onClick={() =>
                      setExpanded((current) => {
                        const next = new Set(current);
                        next.has(node.id)
                          ? next.delete(node.id)
                          : next.add(node.id);
                        return next;
                      })
                    }
                    type="button"
                  >
                    {isExpanded ? (
                      <ChevronDown className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </button>
                ) : (
                  <span className="w-4" />
                )}
                {folder ? (
                  <Folder className="size-4" />
                ) : (
                  <File className="size-4" />
                )}
                <button
                  className="min-w-0 flex-1 truncate text-left text-sm"
                  onClick={() => {
                    if (node.data.kind === "folder") {
                      setExpanded((current) => new Set(current).add(node.id));
                      return;
                    }
                    const file = node.data.file;
                    setPreviewFile({
                      url: file.downloadUrl,
                      filename: file.filename,
                      contentType: file.contentType,
                      size: file.size,
                      allowDownload: allowDownloads,
                    });
                    router.replace(filePath(file._id), { scroll: false });
                  }}
                  type="button"
                >
                  {node.label}
                </button>
                {file ? (
                  <div className="hidden items-center gap-0.5 group-hover:flex group-focus-within:flex">
                    <button
                      aria-label="Copy link"
                      className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        void navigator.clipboard
                          .writeText(
                            new URL(
                              filePath(file._id),
                              window.location.origin,
                            ).toString(),
                          )
                          .then(() => toast.success("Link copied"))
                      }
                      type="button"
                    >
                      <Link className="size-4" />
                    </button>
                    {allowDownloads ? (
                      <a
                        aria-label="Download"
                        className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                        download={file.filename}
                        href={file.downloadUrl}
                      >
                        <Download className="size-4" />
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      {previewFile ? (
        <div className="min-w-0 flex-1">
          <FilePreview
            file={previewFile}
            mode="embedded"
            onClose={() => {
              setPreviewFile(null);
              router.replace(filePath(null), { scroll: false });
            }}
          />
        </div>
      ) : null}
    </section>
  );
}
