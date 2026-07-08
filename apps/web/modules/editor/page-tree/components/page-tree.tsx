"use client";

import { useEditorSiteOptional } from "@/modules/editor/app/editor-context";
import type { PageListItem } from "@baseblocks/domain";
import { flattenTree } from "../tree/flatten";
import { PageActionsMenu } from "./page-actions-menu";
import { PageTreeItem } from "./page-tree-item";

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
  const items = flattenTree(allPages, isExpanded);
  const childCounts = new Map<string, number>();

  for (const page of allPages) {
    if (!page.parentId) continue;
    childCounts.set(page.parentId, (childCounts.get(page.parentId) ?? 0) + 1);
  }

  if (items.length === 0) return null;

  return (
    <>
      {items.map((item) => (
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
