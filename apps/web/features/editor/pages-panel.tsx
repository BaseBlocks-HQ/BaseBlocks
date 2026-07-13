"use client";

import { CreatePageDialog } from "@/features/editor/pages/create-page-dialog";
import { PageTree } from "@/features/editor/pages/page-tree";
import type { Id } from "@baseblocks/backend";
import type { PageListItem } from "@baseblocks/domain";
import { SidebarMenu } from "@baseblocks/ui/sidebar";

export function PagesPanel({
  canEdit,
  onSelectPage,
  pages,
  selectedPageId,
  site,
}: {
  canEdit: boolean;
  onSelectPage: (pageId: string) => void;
  pages: PageListItem[];
  selectedPageId?: string;
  site: { _id: Id<"sites">; defaultPageId?: Id<"pages"> };
}) {
  return (
    <>
      <div className="flex h-14 items-center justify-between px-3">
        <p className="text-sm font-semibold">Pages</p>
        {canEdit ? <CreatePageDialog siteId={site._id} /> : null}
      </div>
      <div className="px-2 pb-2">
        {pages.length ? (
          <SidebarMenu aria-label="Site pages" className="gap-0.5" role="tree">
            <PageTree
              allPages={pages}
              defaultPageId={site.defaultPageId}
              onSelect={onSelectPage}
              selectedPageId={selectedPageId}
              siteId={site._id}
            />
          </SidebarMenu>
        ) : (
          <p className="px-3 py-4 text-sm text-muted-foreground">
            No pages yet.
          </p>
        )}
      </div>
    </>
  );
}
