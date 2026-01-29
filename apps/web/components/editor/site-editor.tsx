"use client";

import { EditorSkeleton } from "@/components/skeletons";
import { SidebarProvider } from "@/components/ui/sidebar";
import { createBlock, createSection } from "@/lib/sections";
import { DEFAULT_BLOCK_CONTENT } from "@/types";
import type { BlockType, SectionLayout } from "@/types";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
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

  // Mutations for sections
  const createSectionMutation = useMutation(api.sections.mutations.create);
  const addBlockMutation = useMutation(api.sections.mutations.addBlockToSlot);

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
    ? pages?.find((p) => p._id === selectedPageId)
    : pages?.[0];

  // Add section from sidebar
  const handleAddSection = useCallback(
    async (type: SectionLayout) => {
      if (!selectedPage) return;

      const newSection = createSection(type);
      const sectionId = await createSectionMutation({
        pageId: selectedPage._id as Id<"pages">,
        type: newSection.type,
        slots: newSection.slots,
        settings: newSection.settings,
      });

      // Select the first slot of the new section
      if (newSection.slots.length > 0) {
        setTimeout(() => {
          selectSlot(sectionId as string, newSection.slots[0]!.id);
          setSelectedSlotId(newSection.slots[0]!.id);
        }, 100);
      }
    },
    [selectedPage, createSectionMutation, selectSlot],
  );

  // Add block from sidebar
  const handleAddBlock = useCallback(
    async (type: BlockType) => {
      if (!selection.sectionId || !selection.slotId) return;

      const content = DEFAULT_BLOCK_CONTENT[type];
      const newBlock = createBlock(type, content);

      await addBlockMutation({
        sectionId: selection.sectionId as Id<"sections">,
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
          onAddSection={handleAddSection}
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
