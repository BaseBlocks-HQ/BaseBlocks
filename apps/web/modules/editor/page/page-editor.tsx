"use client";

import {
  useEditorSiteOptional,
  useEditorUi,
} from "@/modules/editor/editor-state";
import { PageTabs } from "@/modules/editor/page/page-tabs";
import { Section } from "@/modules/editor/page/section";
import { getStoredAccessSessionTokens } from "@/modules/public-site/access-session";
import { api } from "@baseblocks/backend";
import type { Doc, Id } from "@baseblocks/backend";
import type { PageTab, SectionPreset } from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import { Spinner } from "@baseblocks/ui/spinner";
import {
  DragDropProvider,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { arrayMove, move } from "@dnd-kit/helpers";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Columns2, PanelRight, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type Region = Doc<"sections">["region"];
type BlockOrder = Record<string, string[]>;

function buildBlockOrder(
  columns: Doc<"columns">[] | undefined,
  blocks: Doc<"blocks">[] | undefined,
): BlockOrder {
  if (!columns || !blocks) return {};
  return Object.fromEntries(
    columns.map((column) => [
      column._id,
      blocks
        .filter((block) => block.columnId === column._id)
        .sort((left, right) => left.order - right.order)
        .map((block) => block._id),
    ]),
  );
}

export function PageEditor({ pageId }: { pageId: string }) {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const editorSite = useEditorSiteOptional();
  const canEdit = editorSite?.canEdit ?? true;
  const dragDisabled = authLoading || !isAuthenticated || !canEdit;
  const sessionTokens = getStoredAccessSessionTokens();
  const page = useQuery(api.pages.get, {
    pageId: pageId as Id<"pages">,
    sessionTokens,
  });
  const structure = useQuery(api.pageContent.list, {
    pageId: pageId as Id<"pages">,
  });
  const {
    selection,
    selectSection,
    selectColumn,
    selectBlock,
    clearSelection,
    activeTabId,
    setActiveTabId,
  } = useEditorUi();
  const tabs = page?.pageTabs ?? [];
  const hasTabs = tabs.length > 0;
  const resolvedTabId = hasTabs
    ? tabs.some((tab) => tab.id === activeTabId)
      ? activeTabId
      : (tabs[0]?.id ?? null)
    : null;
  const structureColumns = structure?.columns;
  const structureBlocks = structure?.blocks;
  const serverBlockOrder = useMemo(
    () => buildBlockOrder(structureColumns, structureBlocks),
    [structureBlocks, structureColumns],
  );
  const [blockOrder, setBlockOrder] = useState<BlockOrder>({});
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const blockOrderRef = useRef<BlockOrder>({});
  const blockOrderSnapshot = useRef<BlockOrder>({});
  const blockDragActive = useRef(false);

  useEffect(() => {
    if (blockDragActive.current) return;
    blockOrderRef.current = serverBlockOrder;
    setBlockOrder(serverBlockOrder);
  }, [serverBlockOrder]);

  const blockById = useMemo(
    () => new Map(structure?.blocks.map((block) => [block._id, block])),
    [structure?.blocks],
  );
  const createSection = useMutation(api.pageContent.createSection);
  const removeSection = useMutation(api.pageContent.removeSection);
  const reorderSections = useMutation(api.pageContent.reorderSections);
  const updateBlock = useMutation(api.pageContent.updateBlock);
  const removeBlock = useMutation(api.pageContent.removeBlock);
  const moveBlock = useMutation(api.pageContent.moveBlock);
  const updatePageTabs = useMutation(api.pages.updatePageTabs);
  const disablePageTabs = useMutation(api.pages.disablePageTabs);

  const handleDragStart = (event: DragStartEvent) => {
    const sourceData = event.operation.source?.data as
      | { kind: "section" }
      | { kind: "block" }
      | undefined;
    if (sourceData?.kind !== "block") return;
    const currentOrder =
      Object.keys(blockOrderRef.current).length > 0
        ? blockOrderRef.current
        : serverBlockOrder;
    blockDragActive.current = true;
    setDraggingBlockId(String(event.operation.source?.id));
    blockOrderRef.current = currentOrder;
    blockOrderSnapshot.current = structuredClone(currentOrder);
    setBlockOrder(currentOrder);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const sourceData = event.operation.source?.data as
      | { kind: "section" }
      | { kind: "block" }
      | undefined;
    if (sourceData?.kind !== "block") return;
    // React owns cross-column DOM placement. Disable dnd-kit's direct DOM
    // reparenting and reconcile the grouped ID projection instead.
    event.preventDefault();
    setBlockOrder((currentOrder) => {
      const nextOrder = move(currentOrder, event);
      blockOrderRef.current = nextOrder;
      return nextOrder;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { source } = event.operation;
    if (!source || !isSortable(source)) {
      if (blockDragActive.current) {
        blockDragActive.current = false;
        setDraggingBlockId(null);
        blockOrderRef.current = blockOrderSnapshot.current;
        setBlockOrder(blockOrderSnapshot.current);
      }
      return;
    }
    const data = source.data as
      | { kind: "section"; region: Region }
      | { kind: "block" }
      | undefined;

    if (data?.kind === "section") {
      if (event.canceled || !isAuthenticated) return;
      if (source.initialIndex === source.index) {
        return;
      }
      const ids = (structure?.sections ?? [])
        .filter(
          (section) =>
            section.region === data.region &&
            (!hasTabs || section.tabId === resolvedTabId),
        )
        .sort((a, b) => a.order - b.order)
        .map((section) => section._id);
      const nextIds = arrayMove(ids, source.initialIndex, source.index);
      await reorderSections({
        pageId: pageId as Id<"pages">,
        sectionIds: nextIds,
      });
      return;
    }

    if (data?.kind !== "block") {
      return;
    }
    blockDragActive.current = false;
    setDraggingBlockId(null);
    if (event.canceled || !isAuthenticated) {
      blockOrderRef.current = blockOrderSnapshot.current;
      setBlockOrder(blockOrderSnapshot.current);
      return;
    }

    const blockId = String(source.id);
    const destination = Object.entries(blockOrderRef.current).find(([, ids]) =>
      ids.includes(blockId),
    );
    if (!destination) {
      blockOrderRef.current = blockOrderSnapshot.current;
      setBlockOrder(blockOrderSnapshot.current);
      return;
    }
    const [toColumnId, destinationIds] = destination;
    const toIndex = destinationIds.indexOf(blockId);
    try {
      await moveBlock({
        blockId: blockId as Id<"blocks">,
        toColumnId: toColumnId as Id<"columns">,
        toIndex,
      });
      selectBlock(blockId, toColumnId);
    } catch (_error) {
      blockOrderRef.current = blockOrderSnapshot.current;
      setBlockOrder(blockOrderSnapshot.current);
      toast.error("Failed to move block");
    }
  };

  const addSection = async (preset: SectionPreset) => {
    const created = await createSection({
      pageId: pageId as Id<"pages">,
      preset,
      tabId: resolvedTabId ?? undefined,
    });
    if (created.firstColumnId) selectColumn(created.firstColumnId);
  };

  if (page === undefined || structure === undefined) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }
  if (!page) return <p className="text-muted-foreground">Page not found.</p>;

  const selectedSectionId = selection?.kind === "section" ? selection.id : null;
  const selectedColumnId = selection?.kind === "column" ? selection.id : null;
  const selectedBlockId = selection?.kind === "block" ? selection.id : null;
  const visibleSections = structure.sections
    .filter((section) => !hasTabs || section.tabId === resolvedTabId)
    .sort((a, b) => a.order - b.order);
  const mainSections = visibleSections.filter(
    (section) => section.region === "main",
  );
  const asideSections = visibleSections.filter(
    (section) => section.region === "aside",
  );

  const renderSection = (section: Doc<"sections">, index: number) => {
    const columns = structure.columns
      .filter((column) => column.sectionId === section._id)
      .sort((a, b) => a.order - b.order);
    const blocksByColumn = Object.fromEntries(
      columns.map((column) => [
        column._id,
        (blockOrder[column._id] ?? serverBlockOrder[column._id] ?? [])
          .map((blockId) => blockById.get(blockId as Id<"blocks">))
          .filter((block): block is Doc<"blocks"> => !!block),
      ]),
    );
    return (
      <Section
        key={section._id}
        section={section}
        columns={columns}
        blocksByColumn={blocksByColumn}
        index={index}
        selectedSectionId={selectedSectionId}
        selectedColumnId={selectedColumnId}
        selectedBlockId={selectedBlockId}
        draggingBlockId={draggingBlockId}
        canEdit={canEdit}
        dragDisabled={dragDisabled}
        onSelectSection={selectSection}
        onSelectColumn={selectColumn}
        onSelectBlock={selectBlock}
        onAddBlock={selectColumn}
        onUpdateBlock={(blockId, content) => updateBlock({ blockId, content })}
        onRemoveBlock={(blockId) => {
          clearSelection();
          return removeBlock({ blockId });
        }}
        onRemove={(sectionId) => {
          clearSelection();
          return removeSection({ sectionId });
        }}
      />
    );
  };

  return (
    <div
      role="presentation"
      className="min-h-full w-full"
      onMouseDown={(event) => {
        if (event.button === 0) clearSelection();
      }}
    >
      <article
        className={
          asideSections.length > 0 ? "mx-auto max-w-6xl" : "mx-auto max-w-4xl"
        }
      >
        <h1 className="mb-6 text-2xl font-semibold">{page.title}</h1>
        {hasTabs && resolvedTabId ? (
          <PageTabs
            tabs={tabs as PageTab[]}
            activeTabId={resolvedTabId}
            onActiveTabChange={(tabId) => {
              setActiveTabId(tabId);
              clearSelection();
            }}
            onChange={(pageTabs) =>
              updatePageTabs({
                pageId: pageId as Id<"pages">,
                pageTabs,
              })
            }
            onDisable={() => {
              setActiveTabId(null);
              return disablePageTabs({ pageId: pageId as Id<"pages"> });
            }}
          />
        ) : null}

        <DragDropProvider
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {mainSections.length === 0 && asideSections.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <p className="mb-3 text-sm text-muted-foreground">
                Add the first section to this page.
              </p>
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addSection("single")}
                >
                  <Plus className="mr-1 size-3" /> One column
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addSection("columns")}
                >
                  <Columns2 className="mr-1 size-3" /> Two columns
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addSection("aside")}
                >
                  <PanelRight className="mr-1 size-3" /> Aside
                </Button>
              </div>
            </div>
          ) : asideSections.length > 0 ? (
            <div className="flex gap-8">
              <div className="min-w-0 flex-1 space-y-2">
                {mainSections.map(renderSection)}
              </div>
              <aside className="w-72 shrink-0 space-y-2">
                {asideSections.map(renderSection)}
              </aside>
            </div>
          ) : (
            <div className="space-y-2">{mainSections.map(renderSection)}</div>
          )}
        </DragDropProvider>
      </article>
    </div>
  );
}
