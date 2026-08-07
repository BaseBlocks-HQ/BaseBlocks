"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { SearchAddIcon, SearchMinusIcon } from "@hugeicons/core-free-icons";
import type { PreviewFile } from "@/components/file-viewer/file-viewer";
import { cn } from "@baseblocks/ui/lib/utils";
import { Spinner } from "@baseblocks/ui/spinner";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export default function PdfPreview({ file }: { file: PreviewFile }) {
  const t = useTranslations("libraries.viewer");
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(
    () => new Set([1, 2]),
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      const width = container.clientWidth - 32;
      setContainerWidth(width > 0 ? width : null);
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || numPages === 0) return;
    const nodes = Array.from(
      container.querySelectorAll<HTMLElement>("[data-pdf-page]"),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        setVisiblePages((current) => {
          const next = new Set(current);
          for (const entry of entries) {
            const pageNumber = Number(
              (entry.target as HTMLElement).dataset.pdfPage,
            );
            if (entry.isIntersecting) {
              next.add(pageNumber);
              next.add(pageNumber - 1);
              next.add(pageNumber + 1);
            }
          }
          return next;
        });
      },
      { root: container, rootMargin: "1200px 0px" },
    );
    nodes.forEach((node) => {
      observer.observe(node);
    });
    return () => observer.disconnect();
  }, [numPages]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/20">
      <div className="flex h-10 shrink-0 items-center justify-end gap-1 border-b bg-background/70 px-2">
        <ToolbarButton
          disabled={scale <= 0.5}
          label={t("zoomOut")}
          onClick={() => setScale((value) => Math.max(value - 0.25, 0.5))}
        >
          <HugeiconsIcon icon={SearchMinusIcon} className="h-4 w-4" />
        </ToolbarButton>
        <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground">
          {Math.round(scale * 100)}%
        </span>
        <ToolbarButton
          disabled={scale >= 3}
          label={t("zoomIn")}
          onClick={() => setScale((value) => Math.min(value + 0.25, 3))}
        >
          <HugeiconsIcon icon={SearchAddIcon} className="h-4 w-4" />
        </ToolbarButton>
      </div>
      <div ref={containerRef} className="min-h-0 flex-1 overflow-auto p-4">
        <Document
          file={file.url}
          loading={<PreviewLoading />}
          error={<PreviewError message={t("pdfLoadError")} />}
          onLoadSuccess={({ numPages: nextNumPages }) =>
            setNumPages(nextNumPages)
          }
        >
          <div className="mx-auto flex w-fit flex-col gap-4">
            {getPdfPageNumbers(numPages).map((pageNumber) => (
              <div
                key={pageNumber}
                data-pdf-page={pageNumber}
                className="min-h-[960px] overflow-hidden rounded-sm bg-background shadow-sm"
              >
                {visiblePages.has(pageNumber) ? (
                  <Page
                    pageNumber={pageNumber}
                    renderAnnotationLayer
                    renderTextLayer
                    scale={scale}
                    width={
                      containerWidth ? Math.min(containerWidth, 920) : undefined
                    }
                  />
                ) : null}
              </div>
            ))}
          </div>
        </Document>
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

function ToolbarButton({
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

function getPdfPageNumbers(numPages: number) {
  const pages: number[] = [];
  for (let pageNumber = 1; pageNumber <= numPages; pageNumber += 1) {
    pages.push(pageNumber);
  }
  return pages;
}
