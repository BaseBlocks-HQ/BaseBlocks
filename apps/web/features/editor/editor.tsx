"use client";

import { SiteThemeScope } from "@/components/site-runtime/site-theme-scope";
import { useTeamAccess } from "@/features/authentication/team-access";
import { useEditorWorkspace } from "@/features/editor/editor-state";
import { OpenEditorPageEditor } from "@/features/openeditor/openeditor-page-editor";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type { SaveStatus } from "@baseblocks/domain";
import { PortalContainerProvider } from "@baseblocks/ui/contexts/portal-container-context";
import { Empty, EmptyHeader, EmptyTitle } from "@baseblocks/ui/empty";
import { cn } from "@baseblocks/ui/lib/utils";
import { Spinner } from "@baseblocks/ui/spinner";
import { useMutation, useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { EditorDialogs, type EditorDialogState } from "./editor-dialogs";
import type { DraftSummary } from "./release-dialogs";
import { SiteHeaderContent } from "./site-header-content";

const SiteAiChat = dynamic(() =>
  import("@/features/openeditor-ai/chat/site-ai-chat").then(
    (module) => module.SiteAiChat,
  ),
);

interface SiteEditorProps {
  editorAiEnabled: boolean;
  siteId: string;
}

function SiteEditorScreen({ editorAiEnabled, siteId }: SiteEditorProps) {
  const { team } = useTeamAccess();
  const { pages, selectedPage, site, status } = useEditorWorkspace();
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [activeDialog, setActiveDialog] = useState<EditorDialogState | null>(
    null,
  );
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiApplyRevision, setAiApplyRevision] = useState(0);
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null,
  );

  const draftSummaryQuery = useQuery(api.releases.getDraftSummary, {
    siteId: siteId as Id<"sites">,
  });
  const unpublishSite = useMutation(api.releases.unpublish);

  const handleUnpublish = async () => {
    try {
      await unpublishSite({ siteId: siteId as Id<"sites"> });
      toast.success("Site unpublished");
    } catch (_error) {
      toast.error("Failed to unpublish site");
    }
  };

  if (status === "loading" || draftSummaryQuery === undefined) {
    return <EditorLoading />;
  }

  if (!site || !draftSummaryQuery || site.organizationId !== team._id) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle className="font-normal text-muted-foreground">
            Site not found
          </EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  const draftSummary = draftSummaryQuery as DraftSummary;
  const pageEditor = selectedPage ? (
    <OpenEditorPageEditor
      key={`${selectedPage._id}:${aiApplyRevision}`}
      onSaveStatusChange={setSaveStatus}
      pageId={selectedPage._id}
      pages={pages}
      preview={isPreviewing}
      siteId={site._id}
    />
  ) : (
    <Empty className="min-h-[50vh]">
      <EmptyHeader>
        <EmptyTitle className="font-normal text-muted-foreground">
          Select a page to edit
        </EmptyTitle>
      </EmptyHeader>
    </Empty>
  );

  return (
    <>
      <SiteHeaderContent
        editorAiEnabled={editorAiEnabled}
        teamSlug={team.slug}
        siteSlug={site.slug}
        siteId={site._id}
        sitePublished={Boolean(site.liveReleaseId)}
        siteName={site.name}
        siteLogoUrl={site.logoUrl}
        saveStatus={saveStatus}
        onOpenDialog={(name, returnFocusTo) =>
          setActiveDialog({ name, returnFocusTo })
        }
        isPreviewing={isPreviewing}
        onTogglePreview={() => setIsPreviewing((current) => !current)}
        onUnpublish={handleUnpublish}
        hasUnpublishedChanges={draftSummary.hasUnpublishedChanges}
        aiChatOpen={aiChatOpen}
        onToggleAiChat={() => setAiChatOpen((current) => !current)}
      />

      <div
        ref={setPortalContainer}
        className="pointer-events-none fixed inset-0 z-50 [&>*]:pointer-events-auto"
      />
      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <main
          className={cn(
            "relative min-h-0 min-w-0 flex-1 overflow-hidden",
            editorAiEnabled && aiChatOpen && "max-lg:pointer-events-none",
          )}
        >
          <PortalContainerProvider value={portalContainer ?? undefined}>
            <div className="h-full min-h-0 overflow-auto">
              <div className="px-4 pt-[calc(var(--app-header-height)+1rem)] pb-4 md:px-8 md:pt-[calc(var(--app-header-height)+2rem)] md:pb-8">
                <SiteThemeScope
                  className="min-h-full rounded-2xl"
                  theme={site.settings.theme}
                >
                  {pageEditor}
                </SiteThemeScope>
              </div>
            </div>
          </PortalContainerProvider>
        </main>
        {editorAiEnabled && aiChatOpen ? (
          <aside className="absolute inset-y-0 right-0 z-30 w-full border-l bg-background pt-(--app-header-height) shadow-xl sm:w-[26rem] lg:static lg:z-auto lg:w-[26rem] lg:shrink-0 lg:shadow-none">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center">
                  <Spinner className="size-5 text-muted-foreground" />
                </div>
              }
            >
              <SiteAiChat
                onApplied={() => setAiApplyRevision((revision) => revision + 1)}
                onClose={() => setAiChatOpen(false)}
                siteId={site._id}
              />
            </Suspense>
          </aside>
        ) : null}
      </div>

      <EditorDialogs
        activeDialog={activeDialog}
        draftSummary={draftSummary}
        onActiveDialogChange={setActiveDialog}
        siteId={site._id}
        siteSlug={site.slug}
        teamSlug={team.slug}
      />
    </>
  );
}

export function SiteEditor({ editorAiEnabled, siteId }: SiteEditorProps) {
  return (
    <Suspense fallback={<EditorLoading />}>
      <SiteEditorScreen editorAiEnabled={editorAiEnabled} siteId={siteId} />
    </Suspense>
  );
}

function EditorLoading() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-background">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}
