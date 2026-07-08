"use client";

import { useEditorSiteOptional } from "@/modules/editor/state/editor-context";
import type { PageListItem } from "@baseblocks/domain";
import { PageActionsMenu } from "./page-actions-menu";
import { PageTreeItem, type PageNavigationRow } from "./page-tree-item";

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
        <PageTreeItem
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
