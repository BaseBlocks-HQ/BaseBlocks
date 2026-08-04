"use client";

import { SiteThemeScope } from "@/components/site-runtime/site-theme-scope";
import { useTeamAccess } from "@/features/authentication/team-access";
import { OpenEditorPageEditor } from "@/features/openeditor/openeditor-page-editor";
import { api } from "@baseblocks/backend";
import type { Doc, Id } from "@baseblocks/backend";
import type { SaveStatus } from "@baseblocks/domain";
import { PortalContainerProvider } from "@baseblocks/ui/contexts/portal-container-context";
import { cn } from "@baseblocks/ui/lib/utils";
import { Spinner } from "@baseblocks/ui/spinner";
import { useMutation, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type DraftStatus,
  HistoryDialog,
  PublishDialog,
} from "./release-dialogs";
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
  const searchParams = useSearchParams();
  const selectedPageId = searchParams.get("page");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiApplyRevision, setAiApplyRevision] = useState(0);
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null,
  );

  const site = useQuery(api.sites.get, {
    siteId: siteId as Id<"sites">,
  });
  const pages = useQuery(api.pages.list, {
    siteId: siteId as Id<"sites">,
  });
  const draftStatusQuery = useQuery(api.releases.getDraftStatus, {
    siteId: siteId as Id<"sites">,
  });
  const unpublishSite = useMutation(api.releases.unpublish);

  useEffect(() => {
    if (
      !selectedPageId ||
      !pages ||
      pages.some((page) => page._id === selectedPageId)
    ) {
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    const fallbackPageId = pages[0]?._id;
    if (fallbackPageId) params.set("page", fallbackPageId);
    else params.delete("page");
    window.history.replaceState(null, "", `?${params.toString()}`);
  }, [pages, searchParams, selectedPageId]);

  const handleUnpublish = async () => {
    try {
      await unpublishSite({ siteId: siteId as Id<"sites"> });
      toast.success("Site unpublished");
    } catch (_error) {
      toast.error("Failed to unpublish site");
    }
  };

  const selectedPage = selectedPageId
    ? (pages?.find((page: Doc<"pages">) => page._id === selectedPageId) ??
      pages?.[0])
    : pages?.[0];

  if (
    site === undefined ||
    pages === undefined ||
    draftStatusQuery === undefined
  ) {
    return <EditorLoading />;
  }

  if (!site || site.organizationId !== team._id) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <p className="text-muted-foreground">Site not found</p>
      </div>
    );
  }

  const draftStatus = draftStatusQuery as DraftStatus;
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
    <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
      Select a page to edit
    </div>
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
        onPublish={() => setPublishDialogOpen(true)}
        onOpenHistory={() => setHistoryDialogOpen(true)}
        isPreviewing={isPreviewing}
        onTogglePreview={() => setIsPreviewing((current) => !current)}
        onUnpublish={handleUnpublish}
        hasUnpublishedChanges={draftStatus.hasUnpublishedChanges}
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
            <SiteAiChat
              onApplied={() => setAiApplyRevision((revision) => revision + 1)}
              onClose={() => setAiChatOpen(false)}
              siteId={site._id}
            />
          </aside>
        ) : null}
      </div>

      <PublishDialog
        draftStatus={draftStatus}
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        siteId={site._id}
      />
      <HistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        siteId={site._id}
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
