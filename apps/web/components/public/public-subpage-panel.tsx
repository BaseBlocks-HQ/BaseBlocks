"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { usePublicSubpageContext } from "./public-subpage-context";

export function PublicSubpagePanel() {
  const { viewingSubpage, closeSubpage } = usePublicSubpageContext();

  if (!viewingSubpage) return null;

  const { content } = viewingSubpage;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold text-lg truncate">
          {content.title || "Untitled"}
        </h2>
        <Button variant="ghost" size="icon" onClick={closeSubpage}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {content.description && (
          <p className="text-muted-foreground mb-4">{content.description}</p>
        )}
        {content.content ? (
          <div className="prose prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap">
            {content.content}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No content.</p>
        )}
      </div>
    </div>
  );
}
