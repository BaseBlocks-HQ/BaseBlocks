"use client";

import { usePage } from "@/lib/data";
import { usePublicPagePanelOptional } from "@/modules/public-site/public-page-panel-context";
import type { ElementRendererProps } from "@/modules/site-runtime/registry";
import { ChevronRight, FileText } from "lucide-react";

export function PageRenderer({ content }: ElementRendererProps<"page">) {
  const pagePanel = usePublicPagePanelOptional();
  const page = usePage(content.pageId);

  if (!content.pageId || !page) {
    return null;
  }

  const handleClick = () => {
    pagePanel?.openPage(content.pageId);
  };

  return (
    <div className="not-prose flex w-full items-center gap-2 rounded-md border bg-card/70 p-1.5 transition-colors hover:border-primary/30 hover:bg-primary/5">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        onClick={handleClick}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <FileText className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="truncate text-sm font-medium">{page.title}</h3>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    </div>
  );
}
