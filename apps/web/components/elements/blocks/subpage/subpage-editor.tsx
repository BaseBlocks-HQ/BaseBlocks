"use client";

import { useEditorContextOptional } from "@/components/editor/editor-context";
import type { ElementEditorProps } from "@/components/elements/registry";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { useQuery } from "convex/react";
import { ChevronRight, FileText } from "lucide-react";

export function SubpageEditor({ content }: ElementEditorProps<"subpage">) {
  const editorContext = useEditorContextOptional();
  const page = useQuery(
    api.pages.queries.get,
    content.pageId ? { pageId: content.pageId as Id<"pages"> } : "skip",
  );

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editorContext || !content.pageId) return;
    editorContext.openSubpageEditor({ pageId: content.pageId });
  };

  if (!content.pageId) {
    return (
      <div className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed bg-muted/30 text-muted-foreground">
        <FileText className="h-5 w-5 shrink-0" />
        <span className="text-sm">Sub-page not configured</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-primary/5 hover:border-primary/30 transition-colors text-left"
      onClick={handleClick}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
        <FileText className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{page?.title ?? "Loading..."}</h3>
        <p className="text-sm text-muted-foreground">Click to edit sub-page</p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
    </button>
  );
}
