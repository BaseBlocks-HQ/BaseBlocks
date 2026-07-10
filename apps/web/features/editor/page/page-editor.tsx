"use client";

import {
  useEditorSiteOptional,
  useEditorUi,
} from "@/features/editor/editor-state";
import { PageTabs } from "@/features/editor/page/page-tabs";
import { Section } from "@/features/editor/page/section";
import { getStoredAccessSessionTokens } from "@/features/published-sites/access-session";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type {
  AnyContent,
  PageStructure,
  SectionData,
  SectionPreset,
} from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import { Spinner } from "@baseblocks/ui/spinner";
import { useMutation, useQuery } from "convex/react";
import { Columns2, PanelRight, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const createId = () => crypto.randomUUID();

export function PageEditor({ pageId }: { pageId: string }) {
  const editorSite = useEditorSiteOptional();
  const canEdit = editorSite?.canEdit ?? true;
  const ui = useEditorUi();
  const page = useQuery(api.pages.get, {
    pageId: pageId as Id<"pages">,
    sessionTokens: getStoredAccessSessionTokens(),
  });
  const serverContent = useQuery(api.pageContent.get, {
    pageId: pageId as Id<"pages">,
  });
  const saveContent = useMutation(api.pageContent.save);
  const [content, setContent] = useState<PageStructure | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (serverContent && !saveTimer.current)
      setContent(serverContent as PageStructure);
  }, [serverContent]);

  const update = useCallback(
    (recipe: (draft: PageStructure) => void) => {
      setContent((current) => {
        if (!current) return current;
        const next = structuredClone(current);
        recipe(next);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          saveContent({ pageId: pageId as Id<"pages">, content: next })
            .catch(() => toast.error("Failed to save page"))
            .finally(() => {
              saveTimer.current = null;
            });
        }, 500);
        return next;
      });
    },
    [pageId, saveContent],
  );

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  if (page === undefined || serverContent === undefined || !content) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }
  if (!page) return <p className="text-muted-foreground">Page not found.</p>;

  const tabs = content.tabs;
  const activeTabId = tabs.some((tab) => tab.id === ui.activeTabId)
    ? ui.activeTabId
    : (tabs[0]?.id ?? null);
  const sections = content.sections.filter(
    (section) => tabs.length === 0 || section.tabId === activeTabId,
  );
  const mainSections = sections
    .filter((section) => section.region === "main")
    .sort((a, b) => a.order - b.order);
  const asideSections = sections
    .filter((section) => section.region === "aside")
    .sort((a, b) => a.order - b.order);

  const addSection = (preset: SectionPreset) =>
    update((draft) => {
      const region = preset === "aside" ? "aside" : "main";
      const section: SectionData = {
        id: createId(),
        region,
        tabId: activeTabId ?? undefined,
        order: draft.sections.filter(
          (item) =>
            item.region === region && item.tabId === (activeTabId ?? undefined),
        ).length,
        columns: Array.from(
          { length: preset === "columns" ? 2 : 1 },
          (_, order) => ({ id: createId(), order, blocks: [] }),
        ),
      };
      draft.sections.push(section);
      ui.selectColumn(section.columns[0]!.id);
    });

  const updateBlock = (blockId: string, blockContent: AnyContent) =>
    update((draft) => {
      for (const section of draft.sections)
        for (const column of section.columns) {
          const block = column.blocks.find((item) => item.id === blockId);
          if (block) block.content = blockContent;
        }
    });
  const removeBlock = (blockId: string) =>
    update((draft) => {
      for (const section of draft.sections)
        for (const column of section.columns) {
          column.blocks = column.blocks.filter((block) => block.id !== blockId);
        }
      ui.clearSelection();
    });
  const removeSection = (sectionId: string) =>
    update((draft) => {
      draft.sections = draft.sections.filter(
        (section) => section.id !== sectionId,
      );
      ui.clearSelection();
    });

  const renderSection = (section: SectionData, index: number) => (
    <Section
      key={section.id}
      section={section}
      columns={section.columns}
      blocksByColumn={Object.fromEntries(
        section.columns.map((column) => [column.id, column.blocks]),
      )}
      index={index}
      selectedSectionId={
        ui.selection?.kind === "section" ? ui.selection.id : null
      }
      selectedColumnId={
        ui.selection?.kind === "column"
          ? ui.selection.id
          : ui.selection?.kind === "block"
            ? ui.selection.columnId
            : null
      }
      selectedBlockId={ui.selection?.kind === "block" ? ui.selection.id : null}
      draggingBlockId={null}
      canEdit={canEdit}
      dragDisabled
      onSelectSection={ui.selectSection}
      onSelectColumn={ui.selectColumn}
      onSelectBlock={ui.selectBlock}
      onAddBlock={ui.selectColumn}
      onUpdateBlock={updateBlock}
      onRemoveBlock={removeBlock}
      onRemove={removeSection}
    />
  );

  return (
    <article
      className={
        asideSections.length ? "mx-auto max-w-6xl" : "mx-auto max-w-4xl"
      }
    >
      <h1 className="mb-6 text-2xl font-semibold">{page.title}</h1>
      {tabs.length > 0 && activeTabId ? (
        <PageTabs
          tabs={tabs}
          activeTabId={activeTabId}
          onActiveTabChange={ui.setActiveTabId}
          onChange={(nextTabs) =>
            update((draft) => {
              draft.tabs = nextTabs;
            })
          }
          onDisable={() =>
            update((draft) => {
              draft.tabs = [];
              for (const section of draft.sections) delete section.tabId;
              ui.setActiveTabId(null);
            })
          }
        />
      ) : null}
      {sections.length === 0 ? (
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
      ) : asideSections.length ? (
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
    </article>
  );
}
