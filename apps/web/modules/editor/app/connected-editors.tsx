"use client";

import { useLayouts, usePage } from "@/lib/data";
import { EditorPageDetailPanel } from "@/modules/editor/app/editor-page-detail-panel";
import { PageEditor } from "@/modules/editor/canvas/page-editor";
import { useEditorUi } from "@/modules/editor/state";
import type { LayoutDoc, PageData } from "@/modules/editor/app/types";
import type { LayoutType } from "@baseblocks/domain";

/** Fetches page + layouts data from Convex and renders PageEditor */
export function ConnectedPageEditor({
  pageId,
  onSelectionChange,
  nested,
}: {
  pageId: string;
  onSelectionChange?: (slotId: string | null) => void;
  nested?: boolean;
}) {
  const rawPage = usePage(pageId);
  const rawLayouts = useLayouts(pageId);

  const pageData: PageData | undefined = rawPage
    ? { title: rawPage.title, pageTabs: rawPage.pageTabs ?? [] }
    : undefined;

  const layouts: LayoutDoc[] | undefined = rawLayouts?.map((l) => ({
    _id: l._id as string,
    type: l.type as LayoutType,
    order: l.order,
    tabId: l.tabId,
    slots: l.slots.map((s) => ({
      id: s.id,
      position: s.position,
      blocks: s.blocks.map((b) => ({
        id: b.id,
        type: b.type,
        content: b.content,
      })),
    })),
    settings: l.settings,
  }));

  return (
    <PageEditor
      pageId={pageId}
      pageData={rawPage === undefined ? undefined : (pageData ?? undefined)}
      layouts={layouts}
      onSelectionChange={onSelectionChange}
      nested={nested}
    />
  );
}

/** Fetches page title from Convex and renders the page block edit panel. */
export function ConnectedEditorPageDetailPanel({
  isFullscreen,
  onToggleFullscreen,
}: {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}) {
  const { editingPage } = useEditorUi();
  const page = usePage(editingPage?.pageId);

  return (
    <EditorPageDetailPanel
      pageTitle={page?.title}
      renderPageEditor={(pageId) => (
        <ConnectedPageEditor pageId={pageId} nested />
      )}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
    />
  );
}
