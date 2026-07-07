"use client";

import { ViewerToolbarIconButton } from "@/modules/editor/media-viewer/components/viewer-toolbar-icon-button";
import { PageExportMenu } from "@/modules/editor/page-export/components/page-export-menu";
import { DetailPanelFrame } from "@/core/detail-panel/frame";
import { DetailPanelHeaderChrome } from "@/core/detail-panel/header-chrome";
import { useEditorUi } from "@/modules/editor/state";
import { useEditorMutations } from "@/modules/editor/state";
import { useDebounceCallback } from "@baseblocks/ui/hooks/use-debounce";
import { Maximize2, Minimize2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";

interface EditorPageDetailPanelProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  pageTitle?: string;
  renderPageEditor: (pageId: string) => ReactNode;
}

export function EditorPageDetailPanel({
  isFullscreen,
  onToggleFullscreen,
  pageTitle,
  renderPageEditor,
}: EditorPageDetailPanelProps) {
  const t = useTranslations("editor.pagePanel");
  const { editingPage, closePageEditor } = useEditorUi();
  const { pages: pageMutations } = useEditorMutations();
  const [title, setTitle] = useState(pageTitle ?? "");

  useEffect(() => {
    setTitle(pageTitle ?? "");
  }, [pageTitle]);

  const debouncedSave = useDebounceCallback(async (nextTitle: string) => {
    if (!editingPage?.pageId || !nextTitle.trim()) {
      return;
    }

    try {
      await pageMutations.update({
        pageId: editingPage.pageId,
        title: nextTitle.trim(),
      });
    } catch (_error) {
      toast.error(t("renameFailed"));
    }
  }, 500);

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextTitle = event.target.value;
    setTitle(nextTitle);
    debouncedSave(nextTitle);
  };

  if (!editingPage) {
    return null;
  }

  return (
    <DetailPanelFrame
      bodyClassName="px-3 pb-3 pt-14 md:px-4 md:pb-4"
      headerOverlay
      header={
        <DetailPanelHeaderChrome>
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <div className="min-w-0 flex-1">
              <input
                value={title}
                onChange={handleTitleChange}
                placeholder={t("titlePlaceholder")}
                className="h-8 w-full min-w-0 border-none bg-transparent px-0 text-sm font-medium outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <PageExportMenu
                align="end"
                mode="draft"
                pageId={editingPage.pageId}
              />
              {onToggleFullscreen ? (
                <ViewerToolbarIconButton
                  onClick={onToggleFullscreen}
                  label={isFullscreen ? t("exitFullscreen") : t("fullscreen")}
                  pressed={isFullscreen}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </ViewerToolbarIconButton>
              ) : null}
              <ViewerToolbarIconButton
                onClick={closePageEditor}
                label={t("closeEditor")}
              >
                <X className="h-4 w-4" />
              </ViewerToolbarIconButton>
            </div>
          </div>
        </DetailPanelHeaderChrome>
      }
    >
      {renderPageEditor(editingPage.pageId)}
    </DetailPanelFrame>
  );
}
