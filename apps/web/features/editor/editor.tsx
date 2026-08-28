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
import { useMutation } from "convex/react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { EditorDialogs, type EditorDialogState } from "./editor-dialogs";
import { DraftRestoreGate } from "./draft-restore-gate";
import { EditorRevealBoundary } from "./editor-reveal-boundary";
import {
  siteEditorActionEvent,
  sitePreviewStateEvent,
  type SiteEditorAction,
  type SitePreviewState,
} from "./site-action-event";
import { SiteHeaderContent } from "./site-header-content";

const SiteAiChat = dynamic(() =>
  import("@/features/openeditor-ai/chat/site-ai-chat").then(
    (module) => module.SiteAiChat,
  ),
);

interface SiteEditorProps {
  aiAvailabilityReason: "available" | "creditsRequired" | "siteNotFound";
  siteId: string;
  teamSlug: string;
}

function SiteEditorScreen({
  aiAvailabilityReason,
  siteId,
  teamSlug,
}: SiteEditorProps) {
  const { team } = useTeamAccess();
  const {
    draftSummary,
    pages,
    restore,
    selectedDocument,
    selectedPage,
    site,
    status,
  } = useEditorWorkspace();
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
  const searchParams = useSearchParams();
  const requestedAction = searchParams.get("action");
  const selectedPageId = selectedPage?._id;

  const unpublishSite = useMutation(api.releases.unpublish);

  const handleUnpublish = async () => {
    try {
      await unpublishSite({ siteId: siteId as Id<"sites"> });
      toast.success("Site unpublished");
    } catch (_error) {
      toast.error("Failed to unpublish site");
    }
  };

  useEffect(() => {
    if (status !== "ready" || !requestedAction) return;

    if (requestedAction === "preview") {
      setIsPreviewing(true);
    } else if (
      requestedAction === "history" ||
      requestedAction === "publish" ||
      requestedAction === "settings" ||
      requestedAction === "share"
    ) {
      setActiveDialog({ name: requestedAction, returnFocusTo: null });
    } else {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("action");
    window.history.replaceState(null, "", url);
  }, [requestedAction, status]);

  useEffect(() => {
    const handleSiteAction = (event: Event) => {
      const action = (event as CustomEvent<SiteEditorAction>).detail;
      if (action === "preview") {
        setIsPreviewing((current) => !current);
        return;
      }
      setActiveDialog({ name: action, returnFocusTo: null });
    };

    window.addEventListener(siteEditorActionEvent, handleSiteAction);
    return () =>
      window.removeEventListener(siteEditorActionEvent, handleSiteAction);
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent<SitePreviewState>(sitePreviewStateEvent, {
        detail: { isPreviewing, siteId },
      }),
    );
  }, [isPreviewing, siteId]);

  useEffect(() => {
    if (!restore?._id) return;
    setActiveDialog(null);
    setAiChatOpen(false);
  }, [restore?._id]);

  useEffect(() => {
    if (!selectedPageId) return;
    setSaveStatus("idle");
  }, [selectedPageId]);

  if (status === "loading") {
    return <EditorRevealBoundary state="loading" />;
  }

  if (!site || !draftSummary || site.organizationId !== team._id) {
    return <EditorRevealBoundary state="missing" />;
  }

  const fullWidthBlocks =
    "max(100%, min(calc(100vw - var(--sidebar-width, 0px) - var(--bb-chrome-inset, 0px) - 4rem), calc(100% + 24rem), 90rem))";

  const pageEditor =
    selectedPage && selectedDocument?.pageId === selectedPage._id ? (
      <OpenEditorPageEditor
        authoritativeRefreshRevision={aiApplyRevision}
        fullWidth={fullWidthBlocks}
        key={selectedPage._id}
        onSaveStatusChange={setSaveStatus}
        pageId={selectedPage._id}
        pages={pages}
        preview={isPreviewing}
        remoteDocument={{
          contentHash: selectedDocument.contentHash,
          document: selectedDocument.document,
        }}
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
    <EditorRevealBoundary state="ready">
      {restore ? (
        <DraftRestoreGate restore={restore} />
      ) : (
        <>
          <SiteHeaderContent
            pageId={selectedPage?._id}
            teamSlug={team.slug}
            siteSlug={site.slug}
            siteId={site._id}
            sitePublished={Boolean(site.liveReleaseId)}
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
                aiChatOpen && "max-lg:pointer-events-none",
                aiChatOpen && "lg:mr-[26rem]",
                aiChatOpen && "lg:[--bb-chrome-inset:26rem]",
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
            {aiChatOpen ? (
              <aside className="absolute top-(--app-header-height) right-0 bottom-0 z-30 w-full border-l bg-background shadow-xl sm:w-[26rem] lg:shadow-none">
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center">
                      <Spinner className="size-5 text-muted-foreground" />
                    </div>
                  }
                >
                  <SiteAiChat
                    availabilityReason={aiAvailabilityReason}
                    onApplied={() =>
                      setAiApplyRevision((revision) => revision + 1)
                    }
                    siteId={site._id}
                    siteName={site.name}
                    teamSlug={teamSlug}
                  />
                </Suspense>
              </aside>
            ) : null}
          </div>
          <EditorDialogs
            activeDialog={activeDialog}
            draftSummary={draftSummary}
            onActiveDialogChange={setActiveDialog}
            pageId={selectedPage?._id}
            siteId={site._id}
            siteSlug={site.slug}
            teamSlug={team.slug}
          />
        </>
      )}
    </EditorRevealBoundary>
  );
}

export function SiteEditor(props: SiteEditorProps) {
  return (
    <Suspense fallback={<EditorRevealBoundary state="loading" />}>
      <SiteEditorScreen {...props} />
    </Suspense>
  );
}
