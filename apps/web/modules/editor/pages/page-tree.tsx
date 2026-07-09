"use client";

import { useEditorSiteOptional } from "@/modules/editor/editor-state";
import { cn } from "@/lib/utils";
import { isPageRestricted, type PageListItem } from "@baseblocks/domain";
import { SidebarMenuItem } from "@baseblocks/ui/sidebar";
import { ChevronDown, ChevronRight, EyeOff, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { IconFile, IconHouse } from "nucleo-glass";
import type { ReactNode } from "react";
import { PageActionsMenu } from "./page-actions";

interface PageNavigationRow {
  id: string;
  parentId: string | null;
  depth: number;
  page: PageListItem;
}

const treeItemButtonClassName =
  "flex h-full w-full min-w-0 items-center gap-2 overflow-hidden rounded-md p-2 pr-1 text-left text-sm outline-hidden [&>svg]:size-4 [&>svg]:shrink-0";

const treeItemRowClassName =
  "peer/menu-button grid h-8 w-full min-w-0 grid-cols-[minmax(0,1fr)_1.75rem] items-center overflow-hidden rounded-md text-sm outline-hidden ring-ring transition-colors hover:bg-accent hover:text-accent-foreground active:bg-accent active:text-accent-foreground data-[active=true]:bg-accent data-[active=true]:font-medium data-[active=true]:text-accent-foreground";

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
  const visit = (parentId: string | null, depth: number) => {
    for (const page of childrenByParentId.get(parentId) ?? []) {
      rows.push({
        id: page._id,
        parentId,
        depth,
        page,
      });

      if (isExpanded(page._id)) {
        visit(page._id, depth + 1);
      }
    }
  };

  visit(null, 0);

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
}: {
  actionsMenu?: ReactNode;
  defaultPageId?: string;
  hasChildren: boolean;
  isExpanded: boolean;
  item: PageNavigationRow;
  onSelect: (pageId: string) => void;
  onToggleExpand: () => void;
  selectedPageId?: string;
}) {
  const t = useTranslations("navigation.tree");
  const page = item.page;
  const isDefault = defaultPageId === page._id;
  const isRestricted = isPageRestricted(page.accessPolicy);
  const isHiddenFromNavigation = page.showInNavigation === false;

  const toggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    onToggleExpand();
  };

  return (
    <SidebarMenuItem
      className={cn("group/page relative w-full min-w-0 overflow-hidden")}
      style={{ paddingLeft: item.depth * 16 }}
    >
      <div
        data-active={selectedPageId === page._id}
        className={treeItemRowClassName}
      >
        <button
          type="button"
          onClick={() => onSelect(page._id)}
          className={treeItemButtonClassName}
        >
          {hasChildren ? (
            <span className="relative h-4 w-4 shrink-0">
              <span className="absolute inset-0 flex items-center justify-center opacity-100 transition-opacity group-hover/page:opacity-0">
                {isDefault ? (
                  <IconHouse className="h-4 w-4 text-primary" />
                ) : (
                  <IconFile className="h-4 w-4" />
                )}
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={toggle}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onToggleExpand();
                  }
                }}
                className="absolute inset-0 flex cursor-pointer items-center justify-center text-muted-foreground opacity-0 transition-colors hover:text-foreground group-hover/page:opacity-100"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </span>
            </span>
          ) : isDefault ? (
            <IconHouse className="h-4 w-4 text-primary" />
          ) : (
            <IconFile className="h-4 w-4" />
          )}

          <span className="min-w-0 flex-1 truncate">{page.title}</span>
          {isHiddenFromNavigation ? (
            <EyeOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : null}
          {isRestricted ? (
            <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : null}
          {isDefault ? (
            <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
              {t("defaultBadge")}
            </span>
          ) : null}
        </button>

        {actionsMenu ? (
          <div className="relative z-10 flex h-8 w-7 min-w-0 items-center justify-center overflow-hidden">
            {actionsMenu}
          </div>
        ) : (
          <span className="h-8 w-7 min-w-0" />
        )}
      </div>
    </SidebarMenuItem>
  );
}
