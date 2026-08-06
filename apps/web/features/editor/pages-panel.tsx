"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { CreatePageDialog } from "@/features/editor/pages/create-page-dialog";
import { PageTree } from "@/features/editor/pages/page-tree";
import { AnimatedDisclosure } from "@/components/tree/animated-tree";
import type { Id } from "@baseblocks/backend";
import type { PageListItem } from "@baseblocks/domain";
import { Empty, EmptyHeader, EmptyTitle } from "@baseblocks/ui/empty";
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
      <div className="mt-px h-7 w-full">
        <div className="group/pages relative h-7 w-full min-w-0 rounded-md text-sidebar-foreground/62 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground group-has-[button[data-pages-action]:focus-visible]:bg-sidebar-accent group-has-[button[data-pages-action]:focus-visible]:text-sidebar-foreground">
          <button
            aria-expanded={pagesExpanded}
            className="flex h-7 w-full min-w-0 items-center gap-0 rounded-md pe-10 ps-[var(--app-sidebar-leading-inset)] text-left text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring"
            onClick={() => setPagesExpanded((current) => !current)}
            type="button"
          >
            <span className="flex size-5 shrink-0 items-center justify-center">
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                aria-hidden
                className={`size-3.5 transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
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
                  className="absolute inset-y-0 end-[var(--app-sidebar-trailing-inset)] z-20 flex w-7 items-center justify-center rounded-md text-sidebar-foreground/45 transition-colors hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring"
                  data-pages-action
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
      <AnimatedDisclosure className="pt-px pb-2" open={pagesExpanded}>
        {pages.length ? (
          <SidebarMenu aria-label="Site pages" className="gap-0" role="tree">
            <PageTree
              allPages={pages}
              defaultPageId={site.defaultPageId}
              onSelect={onSelectPage}
              selectedPageId={selectedPageId}
              siteId={site._id}
            />
          </SidebarMenu>
        ) : (
          <Empty className="min-h-20 rounded-none px-3 py-4">
            <EmptyHeader>
              <EmptyTitle className="font-normal text-muted-foreground">
                No pages yet
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
      </AnimatedDisclosure>
    </>
  );
}
