"use client";

import { useEditorSiteOptional } from "@/features/editor/editor-state";
import { InlineRename } from "@/components/tree/inline-rename";
import { OverflowTooltip } from "@/components/tree/overflow-tooltip";
import { api, type Id } from "@baseblocks/backend";
import { useMutation } from "convex/react";
import { generateSlug, type PageListItem } from "@baseblocks/domain";
import { SidebarMenuButton, SidebarMenuItem } from "@baseblocks/ui/sidebar";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { PageActionsMenu } from "./page-actions";

interface PageNavigationRow {
  id: string;
  parentId: string | null;
  page: PageListItem;
}

function buildPageNavigationRows(
  pages: PageListItem[],
  isExpanded: (pageId: string) => boolean,
) {
  const childrenByParentId = new Map<string | null, PageListItem[]>();
  const childCounts = new Map<string, number>();

  for (const page of pages) {
    const parentId = page.parentId ?? null;
    const siblings = childrenByParentId.get(parentId) ?? [];
    siblings.push(page);
    childrenByParentId.set(parentId, siblings);

    if (parentId) {
      childCounts.set(parentId, (childCounts.get(parentId) ?? 0) + 1);
    }
  }

  for (const siblings of childrenByParentId.values()) {
    siblings.sort((left, right) => left.order - right.order);
  }

  const rows: PageNavigationRow[] = [];
  const visit = (parentId: string | null) => {
    for (const page of childrenByParentId.get(parentId) ?? []) {
      rows.push({
        id: page._id,
        parentId,
        page,
      });

      if (isExpanded(page._id)) {
        visit(page._id);
      }
    }
  };

  visit(null);

  return { childCounts, rows };
}

interface PageTreeProps {
  allPages: PageListItem[];
  selectedPageId?: string;
  siteId: string;
  defaultPageId?: string;
  onSelect: (pageId: string) => void;
  isExpanded?: (pageId: string) => boolean;
  onToggleExpand?: (pageId: string) => void;
  onSetExpanded?: (pageId: string, expanded: boolean) => void;
}

export function PageTree({
  allPages,
  selectedPageId,
  siteId,
  defaultPageId,
  onSelect,
  isExpanded: isExpandedProp,
  onToggleExpand,
  onSetExpanded,
}: PageTreeProps) {
  const editorSite = useEditorSiteOptional();
  const canEdit = editorSite?.canEdit ?? false;
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const updatePage = useMutation(api.pages.update);
  const isExpanded = isExpandedProp ?? (() => false);
  const { childCounts, rows } = buildPageNavigationRows(allPages, isExpanded);

  if (rows.length === 0) return null;

  return (
    <>
      {rows.map((item) => (
        <PageTreeRow
          key={item.id}
          item={item}
          selectedPageId={selectedPageId}
          defaultPageId={defaultPageId}
          hasChildren={(childCounts.get(item.id) ?? 0) > 0}
          isExpanded={isExpanded(item.id)}
          onSelect={onSelect}
          onToggleExpand={() => onToggleExpand?.(item.id)}
          actionsMenu={
            canEdit ? (
              <PageActionsMenu
                page={item.page}
                siteId={siteId}
                isDefault={defaultPageId === item.page._id}
                onExpandParent={() => onSetExpanded?.(item.id, true)}
              />
            ) : null
          }
          renaming={renamingId === item.id}
          onRename={() => setRenamingId(item.id)}
          onRenameCancel={() => setRenamingId(null)}
          onRenameSave={async (title) => {
            await updatePage({
              pageId: item.page._id as Id<"pages">,
              title,
              slug: generateSlug(title),
            });
            setRenamingId(null);
          }}
        />
      ))}
    </>
  );
}

function PageTreeRow({
  actionsMenu,
  defaultPageId,
  hasChildren,
  isExpanded,
  item,
  onSelect,
  onToggleExpand,
  selectedPageId,
  renaming,
  onRename,
  onRenameCancel,
  onRenameSave,
}: {
  actionsMenu?: ReactNode;
  defaultPageId?: string;
  hasChildren: boolean;
  isExpanded: boolean;
  item: PageNavigationRow;
  onSelect: (pageId: string) => void;
  onToggleExpand: () => void;
  selectedPageId?: string;
  renaming: boolean;
  onRename: () => void;
  onRenameCancel: () => void;
  onRenameSave: (title: string) => Promise<void>;
}) {
  const t = useTranslations("navigation.tree");
  const page = item.page;
  const isDefault = defaultPageId === page._id;

  return (
    <SidebarMenuItem className="group/page relative w-full min-w-0">
      <SidebarMenuButton
        asChild
        isActive={selectedPageId === page._id}
        className="grid grid-cols-[1.75rem_minmax(0,1fr)_1.75rem] gap-0 p-0 font-normal data-[active=true]:font-medium"
      >
        <div>
          {hasChildren ? (
            <button
              type="button"
              aria-label={`${isExpanded ? "Collapse" : "Expand"} ${page.title}`}
              className="flex h-8 w-7 items-center justify-center text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              onClick={onToggleExpand}
            >
              {isExpanded ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
            </button>
          ) : (
            <span className="h-8 w-7" />
          )}

          <OverflowTooltip content={page.title} disabled={renaming}>
            {(textRef) => (
              <button
                type="button"
                onClick={() => onSelect(page._id)}
                className="flex h-8 min-w-0 items-center gap-1.5 overflow-hidden pr-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                {renaming ? (
                  <InlineRename
                    label={`Rename ${page.title}`}
                    value={page.title}
                    onCancel={onRenameCancel}
                    onSave={onRenameSave}
                  />
                ) : (
                  <span
                    ref={textRef}
                    className="min-w-0 flex-1 truncate"
                    onDoubleClick={onRename}
                  >
                    {page.title}
                  </span>
                )}
                {isDefault ? (
                  <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                    {t("defaultBadge")}
                  </span>
                ) : null}
              </button>
            )}
          </OverflowTooltip>

          {actionsMenu ? (
            <div className="relative z-10 flex h-8 w-7 items-center justify-center">
              {actionsMenu}
            </div>
          ) : (
            <span className="h-8 w-7" />
          )}
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
