"use client";

import { PageExportMenu } from "@/modules/page-export/components/page-export-menu";
import { useEditorUi } from "@/modules/shared/contexts/editor-context";
import { useEditorMutations } from "@/modules/shared/contexts/editor-mutations";
import { Button } from "@baseblocks/ui/button";
import { useDebounceCallback } from "@baseblocks/ui/hooks/use-debounce";
import { Input } from "@baseblocks/ui/input";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import { Maximize2, Minimize2, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

interface PageBlockEditPanelProps {
  pageTitle?: string;
  renderPageEditor: (pageId: string) => ReactNode;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function PageBlockEditPanel({
  pageTitle,
  renderPageEditor,
  isFullscreen,
  onToggleFullscreen,
}: PageBlockEditPanelProps) {
  const { editingPage, closePageEditor } = useEditorUi();
  const { pages: pageMutations } = useEditorMutations();
  const [title, setTitle] = useState(pageTitle ?? "");

  const debouncedSave = useDebounceCallback(async (newTitle: string) => {
    if (!editingPage?.pageId || !newTitle.trim()) return;
    try {
      await pageMutations.update({
        pageId: editingPage.pageId,
        title: newTitle.trim(),
      });
    } catch (_error) {
      toast.error("Failed to rename page");
    }
  }, 500);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    debouncedSave(e.target.value);
  };

  if (!editingPage) return null;

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 shrink-0 border-b">
        <Input
          value={title}
          onChange={handleTitleChange}
          placeholder="Page title..."
          className="h-8 text-sm font-medium flex-1 border-none shadow-none focus-visible:ring-0 px-1"
        />
        <div className="flex items-center gap-1 shrink-0">
          <PageExportMenu pageId={editingPage.pageId} mode="draft" />
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
            onClick={closePageEditor}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Full page editor for the referenced page */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">
          <PageEditorContent
            pageId={editingPage.pageId}
            renderPageEditor={renderPageEditor}
          />
        </div>
      </ScrollArea>
    </div>
  );
}

function PageEditorContent({
  pageId,
  renderPageEditor,
}: {
  pageId: string;
  renderPageEditor: (pageId: string) => ReactNode;
}) {
  return renderPageEditor(pageId);
}
