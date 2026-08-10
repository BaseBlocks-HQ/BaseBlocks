"use client";

import { SiteThemeScope } from "@/components/site-runtime/site-theme-scope";
import { GuestEditorProvider } from "@/features/editor/editor-state";
import { Link } from "@/i18n/navigation";
import { workspaceApi } from "@/lib/convex/workspace-api";
import { OpenEditorPageEditor } from "@/features/openeditor/openeditor-page-editor";
import type { Doc, Id } from "@baseblocks/backend";
import { Empty, EmptyHeader, EmptyTitle } from "@baseblocks/ui/empty";
import { Spinner } from "@baseblocks/ui/spinner";
import { useQuery } from "convex/react";

type GuestPage = Doc<"pages"> & { guestPermission: "viewer" | "editor" };
type GuestWorkspace = {
  site: {
    _id: Id<"sites">;
    name: string;
    settings: Doc<"sites">["settings"];
  };
  pages: GuestPage[];
  selectedPageId: Id<"pages">;
  permission: "viewer" | "editor";
};

export function GuestPage({ pageId }: { pageId: string }) {
  const result = useQuery(workspaceApi.pageGuests.getGuestWorkspace, {
    pageId: pageId as Id<"pages">,
  }) as GuestWorkspace | null | undefined;
  if (result === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-5" />
      </div>
    );
  }
  if (!result) {
    return (
      <Empty className="min-h-screen">
        <EmptyHeader>
          <EmptyTitle>Page not found</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }
  const selectedPage = result.pages.find((page) => page._id === pageId);
  if (!selectedPage) return null;
  return (
    <GuestEditorProvider
      canEdit={selectedPage.guestPermission === "editor"}
      siteId={result.site._id}
    >
      <div className="flex min-h-screen bg-background">
        <aside className="w-64 shrink-0 border-r p-4">
          <p className="mb-4 truncate text-sm font-semibold">
            {result.site.name}
          </p>
          <nav aria-label="Shared pages" className="space-y-1">
            {result.pages.map((page) => (
              <Link
                className="block truncate rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                href={`/guest/pages/${page._id}`}
                key={page._id}
              >
                {page.icon ? `${page.icon} ` : ""}
                {page.title}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 p-6 md:p-10">
          <SiteThemeScope
            className="mx-auto min-h-[70vh] max-w-5xl rounded-2xl"
            theme={result.site.settings.theme}
          >
            <OpenEditorPageEditor
              pageId={selectedPage._id}
              pages={result.pages}
              preview={selectedPage.guestPermission !== "editor"}
              siteId={result.site._id}
            />
          </SiteThemeScope>
        </main>
      </div>
    </GuestEditorProvider>
  );
}
