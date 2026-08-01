"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { CreatePageDialog } from "@/features/editor/pages/create-page-dialog";
import { PageTree } from "@/features/editor/pages/page-tree";
import type { Id } from "@baseblocks/backend";
import type { PageListItem } from "@baseblocks/domain";
import { SidebarMenu } from "@baseblocks/ui/sidebar";
import { useState } from "react";

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
  const [pagesExpanded, setPagesExpanded] = useState(true);

  return (
    <>
      <div className="flex h-10 items-center">
        <div className="flex h-7 min-w-0 flex-1 items-center rounded-md text-sidebar-foreground/62 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground">
          <button
            aria-expanded={pagesExpanded}
            className="flex h-full min-w-0 flex-1 items-center gap-0 rounded-md text-left text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring"
            onClick={() => setPagesExpanded((current) => !current)}
            type="button"
          >
            <span className="flex size-5 shrink-0 items-center justify-center">
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                aria-hidden
                className={`size-3.5 transition-transform duration-150 ${
                  pagesExpanded ? "" : "-rotate-90"
                }`}
              />
            </span>
            <span className="min-w-0 flex-1 truncate">Pages</span>
          </button>
          {canEdit ? (
            <CreatePageDialog
              siteId={site._id}
              trigger={
                <button
                  aria-label="Add page"
                  className="flex size-6 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/45 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                  type="button"
                >
                  <HugeiconsIcon
                    icon={Add01Icon}
                    aria-hidden
                    className="size-3.5"
                  />
                </button>
              }
            />
          ) : null}
        </div>
      </div>
      <div className="pb-2" hidden={!pagesExpanded}>
        {pages.length ? (
          <SidebarMenu aria-label="Site pages" className="gap-px" role="tree">
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
