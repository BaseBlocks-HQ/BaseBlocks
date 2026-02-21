"use client";

import { useLayouts, usePage } from "@/lib/data";
import { PageEditor } from "@/modules/editor/components/page-editor";
import { useEditorContext } from "@/modules/editor/contexts/editor-context";
import type { LayoutDoc, PageData } from "@/modules/editor/types";
import type { LayoutType } from "@baseblocks/types";
import { SubpageEditPanel } from "./subpage-edit-panel";

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
    : rawPage === null
      ? undefined
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

/** Fetches subpage title from Convex and renders SubpageEditPanel */
export function ConnectedSubpageEditPanel({
  isFullscreen,
  onToggleFullscreen,
}: {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}) {
  const { editingSubpage } = useEditorContext();
  const page = usePage(editingSubpage?.pageId);

  return (
    <SubpageEditPanel
      pageTitle={page?.title}
      renderPageEditor={(pageId) => (
        <ConnectedPageEditor pageId={pageId} nested />
      )}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
    />
  );
}
