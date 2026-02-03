"use client";

import { usePublicSubpageContextOptional } from "@/components/public/public-subpage-context";
import type { ElementRendererProps } from "@/components/elements/registry";
import { ChevronRight, FileText } from "lucide-react";

export function SubpageRenderer({ content }: ElementRendererProps<"subpage">) {
  const subpageContext = usePublicSubpageContextOptional();

  if (!content.title) {
    return null;
  }

  const handleClick = () => {
    if (subpageContext) {
      subpageContext.openSubpage(content);
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
        <h3 className="font-medium truncate">{content.title}</h3>
        {content.description && (
          <p className="text-sm text-muted-foreground truncate">
            {content.description}
          </p>
        )}
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
    </button>
  );
}
