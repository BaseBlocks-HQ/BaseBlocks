"use client";

import type { ElementRendererProps } from "@/features/elements/registry";
import { usePublicSubpageContextOptional } from "@/features/public-site/public-subpage-context";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { useQuery } from "convex/react";
import { ChevronRight, FileText } from "lucide-react";

export function SubpageRenderer({ content }: ElementRendererProps<"subpage">) {
  const subpageContext = usePublicSubpageContextOptional();
  const page = useQuery(
    api.pages.queries.get,
    content.pageId ? { pageId: content.pageId as Id<"pages"> } : "skip",
  );

  if (!content.pageId || !page) {
    return null;
  }

  const handleClick = () => {
    if (subpageContext) {
      subpageContext.openSubpage(content.pageId);
    }
  };

  return (
    <button
      type="button"
      className="w-full flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-primary/5 hover:border-primary/30 transition-colors text-left"
      onClick={handleClick}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
        <FileText className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{page.title}</h3>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
    </button>
  );
}
