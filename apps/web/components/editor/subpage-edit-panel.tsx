"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounceCallback } from "@/hooks";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { useMutation, useQuery } from "convex/react";
import { Maximize2, Minimize2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useEditorContext } from "./editor-context";
import { PageEditor } from "./page-editor";

interface SubpageEditPanelProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function SubpageEditPanel({
  isFullscreen,
  onToggleFullscreen,
}: SubpageEditPanelProps) {
  const { editingSubpage, closeSubpageEditor } = useEditorContext();
  const page = useQuery(
    api.pages.queries.get,
    editingSubpage?.pageId
      ? { pageId: editingSubpage.pageId as Id<"pages"> }
      : "skip",
  );
  const updatePage = useMutation(api.pages.mutations.update);

  const [title, setTitle] = useState("");

  // Sync title from server
  useEffect(() => {
    if (page?.title) {
      setTitle(page.title);
    }
  }, [page?.title]);

  const debouncedSave = useDebounceCallback(
    useCallback(
      async (newTitle: string) => {
        if (!editingSubpage?.pageId || !newTitle.trim()) return;
        try {
          await updatePage({
            pageId: editingSubpage.pageId as Id<"pages">,
            title: newTitle.trim(),
          });
        } catch (error) {
          console.error("Failed to rename sub-page:", error);
          toast.error("Failed to rename sub-page");
        }
      },
      [editingSubpage?.pageId, updatePage],
    ),
    500,
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    debouncedSave(e.target.value);
  };

  if (!editingSubpage) return null;

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 shrink-0 border-b">
        <Input
          value={title}
          onChange={handleTitleChange}
          placeholder="Sub-page title..."
          className="h-8 text-sm font-medium flex-1 border-none shadow-none focus-visible:ring-0 px-1"
        />
        <div className="flex items-center gap-1 shrink-0">
          {onToggleFullscreen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onToggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={closeSubpageEditor}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Full page editor for the subpage */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4">
        <PageEditor pageId={editingSubpage.pageId} nested />
      </div>
    </div>
  );
}
