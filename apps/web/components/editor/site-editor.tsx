"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { SidebarProvider } from "@/components/ui/sidebar";
import { EditorSkeleton } from "@/components/skeletons";
import { EditorSidebar } from "./editor-sidebar";
import { EditorHeader } from "./editor-header";
import { PageEditor } from "./page-editor";
import { EditorProvider } from "./editor-context";

interface SiteEditorProps {
  siteId: string;
}

export function SiteEditor({ siteId }: SiteEditorProps) {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const siteData = useQuery(api.sites.queries.getWithCompany, {
    siteId: siteId as Id<"sites">,
  });
  const pages = useQuery(api.pages.queries.list, {
    siteId: siteId as Id<"sites">,
  });
  const publishSite = useMutation(api.sites.mutations.publish);

  const handlePublish = async () => {
    await publishSite({ siteId: siteId as Id<"sites"> });
  };

  if (siteData === undefined || pages === undefined) {
    return <EditorSkeleton />;
  }

  if (!siteData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Site not found</p>
      </div>
    );
  }

  const { site, company } = siteData;
  const selectedPage = selectedPageId
    ? pages.find((p) => p._id === selectedPageId)
    : pages[0];

  return (
    <EditorProvider siteId={siteId as Id<"sites">}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <EditorSidebar
            site={site}
            company={company}
            pages={pages}
            selectedPageId={selectedPage?._id}
            onSelectPage={setSelectedPageId}
          />

          <main className="flex-1 flex flex-col">
            <EditorHeader
              companySlug={company.slug}
              sitePublished={site.isPublished}
              onPublish={handlePublish}
            />

            <div className="flex-1 p-8 overflow-auto">
              {selectedPage ? (
                <PageEditor pageId={selectedPage._id} />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Select a page to edit
                </div>
              )}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </EditorProvider>
  );
}
