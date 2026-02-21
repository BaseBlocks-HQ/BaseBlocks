"use client";

import { useEditorContext } from "@/modules/editor/contexts/editor-context";
import { useEditorMutations } from "@/modules/editor/contexts/editor-mutations";
import { Button } from "@baseblocks/ui/button";
import { useDebounceCallback } from "@baseblocks/ui/hooks/use-debounce";
import { Input } from "@baseblocks/ui/input";
import { Maximize2, Minimize2, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";

interface SubpageEditPanelProps {
  pageTitle?: string;
  renderPageEditor: (pageId: string) => ReactNode;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function SubpageEditPanel({
  pageTitle,
  renderPageEditor,
  isFullscreen,
  onToggleFullscreen,
}: SubpageEditPanelProps) {
  const { editingSubpage, closeSubpageEditor } = useEditorContext();
  const { pages: pageMutations } = useEditorMutations();

  const [title, setTitle] = useState("");

  // Sync title from server
  useEffect(() => {
    if (pageTitle) {
      setTitle(pageTitle);
    }
  }, [pageTitle]);

  const debouncedSave = useDebounceCallback(async (newTitle: string) => {
    if (!editingSubpage?.pageId || !newTitle.trim()) return;
    try {
      await pageMutations.update({
        pageId: editingSubpage.pageId,
        title: newTitle.trim(),
      });
    } catch (_error) {
      toast.error("Failed to rename sub-page");
    }
  }, 500);

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
        {renderPageEditor(editingSubpage.pageId)}
      </div>
    </div>
  );
}
