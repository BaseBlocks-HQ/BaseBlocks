"use client";

import { EditorSkeleton } from "@/components/skeletons";
import { SidebarProvider } from "@/components/ui/sidebar";
import { createBlock, createLayout } from "@/lib/layouts";
import { DEFAULT_BLOCK_CONTENT } from "@/types";
import type { BlockType, LayoutType } from "@/types";
import { api } from "@repo/backend";
import type { Doc, Id } from "@repo/backend";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { EditorProvider, useEditorContext } from "./editor-context";
import { EditorHeader } from "./editor-header";
import { EditorSidebar } from "./editor-sidebar";
import { PageEditor } from "./page-editor";

interface SiteEditorProps {
  siteId: string;
}

// Inner component that has access to EditorContext
function SiteEditorInner({ siteId }: SiteEditorProps) {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const { selection, selectSlot } = useEditorContext();

  const siteData = useQuery(api.sites.queries.getWithCompany, {
    siteId: siteId as Id<"sites">,
  });
  const pages = useQuery(api.pages.queries.list, {
    siteId: siteId as Id<"sites">,
  });

  // Mutations for layouts
  const createLayoutMutation = useMutation(api.layouts.mutations.create);
  const addBlockMutation = useMutation(api.layouts.mutations.addBlockToSlot);

  const publishSite = useMutation(api.sites.mutations.publish);
  const unpublishSite = useMutation(api.sites.mutations.unpublish);

  const handlePublish = async () => {
    await publishSite({ siteId: siteId as Id<"sites"> });
  };

  const handleUnpublish = async () => {
    await unpublishSite({ siteId: siteId as Id<"sites"> });
  };

  // Handle slot selection change from PageEditor
  const handleSlotSelectionChange = useCallback((slotId: string | null) => {
    setSelectedSlotId(slotId);
  }, []);

  // Get the currently selected page
  const selectedPage = selectedPageId
    ? pages?.find((p: Doc<"pages">) => p._id === selectedPageId)
    : pages?.[0];

  // Add layout from sidebar
  const handleAddLayout = useCallback(
    async (type: LayoutType) => {
      if (!selectedPage) return;

      const newLayout = createLayout(type);
      const layoutId = await createLayoutMutation({
        pageId: selectedPage._id as Id<"pages">,
        type: newLayout.type,
        slots: newLayout.slots,
        settings: newLayout.settings,
      });

      // Select the first slot of the new layout
      if (newLayout.slots.length > 0) {
        setTimeout(() => {
          selectSlot(layoutId as string, newLayout.slots[0]!.id);
          setSelectedSlotId(newLayout.slots[0]!.id);
        }, 100);
      }
    },
    [selectedPage, createLayoutMutation, selectSlot],
  );

  // Add block from sidebar
  const handleAddBlock = useCallback(
    async (type: BlockType) => {
      if (!selection.layoutId || !selection.slotId) return;

      const content = DEFAULT_BLOCK_CONTENT[type];
      const newBlock = createBlock(type, content);

      await addBlockMutation({
        layoutId: selection.layoutId as Id<"layouts">,
        slotId: selection.slotId,
        block: {
          id: newBlock.id,
          type: newBlock.type,
          content: newBlock.content,
        },
      });
    },
    [selection, addBlockMutation],
  );

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

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <EditorSidebar
          site={site}
          company={company}
          pages={pages}
          selectedPageId={selectedPage?._id}
          selectedSlotId={selection.slotId}
          onSelectPage={setSelectedPageId}
          onAddLayout={handleAddLayout}
          onAddBlock={handleAddBlock}
        />

        <main className="flex-1 flex flex-col">
          <EditorHeader
            companySlug={company.slug}
            sitePublished={site.isPublished}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
          />

          <div className="flex-1 p-8 overflow-auto">
            {selectedPage ? (
              <PageEditor
                pageId={selectedPage._id}
                onSelectionChange={handleSlotSelectionChange}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a page to edit
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

// Wrapper that provides EditorContext
export function SiteEditor({ siteId }: SiteEditorProps) {
  return (
    <EditorProvider siteId={siteId as Id<"sites">}>
      <SiteEditorInner siteId={siteId} />
    </EditorProvider>
  );
}
