"use client";

import { SiteThemeScope } from "@/components/site-runtime/site-theme-scope";
import { useTeamAccess } from "@/features/authentication/team-access";
import { useEditorWorkspace } from "@/features/editor/editor-state";
import { OpenEditorPageEditor } from "@/features/openeditor/openeditor-page-editor";
import { api } from "@baseblocks/backend";
import type { Doc, Id } from "@baseblocks/backend";
import type { SaveStatus } from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
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
  aiAvailabilityReason:
    | "available"
    | "creditsRequired"
    | "reconciliationRequired"
    | "policyUnavailable"
    | "siteNotFound";
  siteId: string;
  teamSlug: string;
}

function SiteEditorScreen({
  aiAvailabilityReason,
  siteId,
  teamSlug,
}: SiteEditorProps) {
  const { team } = useTeamAccess();
  const { pages, restore, selectedPage, site, status } = useEditorWorkspace();
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
      authoritativeRefreshRevision={aiApplyRevision}
      key={selectedPage._id}
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
      {restore ? (
        <DraftRestoreGate restore={restore} />
      ) : (
        <>
          <SiteHeaderContent
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
                aiChatOpen && "max-lg:pointer-events-none",
                aiChatOpen && "lg:mr-[26rem]",
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
        </>
      )}

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
  );
}

function DraftRestoreGate({
  restore,
}: {
  restore: {
    _id: Id<"draftRestores">;
    status: Doc<"draftRestores">["status"] | "orphaned";
    failure?: string;
  };
}) {
  const resume = useMutation(api.draftRestores.resume);
  const cancel = useMutation(api.draftRestores.cancel);
  const [resuming, setResuming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-background p-6">
      <div className="max-w-md text-center">
        {restore.status !== "paused" && restore.status !== "orphaned" ? (
          <Spinner className="mx-auto size-6 text-muted-foreground" />
        ) : null}
        <h1 className="mt-4 text-base font-semibold">
          {restore.status === "paused"
            ? "Draft restore paused"
            : restore.status === "orphaned"
              ? "Draft restore needs recovery"
              : restore.status === "validating"
                ? "Checking historical version"
                : "Restoring draft"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {restore.status === "paused"
            ? (restore.failure ??
              "The restore paused after repeated failures. Resume it to continue safely.")
            : restore.status === "orphaned"
              ? restore.failure
              : "The editor stays locked until the historical draft is coherent and ready."}
        </p>
        {restore.status === "paused" ? (
          <Button
            className="mt-4 rounded-full"
            disabled={resuming}
            onClick={async () => {
              setResuming(true);
              try {
                await resume({ restoreId: restore._id });
              } catch (error) {
                setResuming(false);
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "The restore could not resume",
                );
              }
            }}
          >
            {resuming ? <Spinner /> : null}
            Resume restore
          </Button>
        ) : null}
        {restore.status === "validating" ? (
          <Button
            className="mt-4 rounded-full"
            disabled={cancelling}
            onClick={async () => {
              setCancelling(true);
              try {
                await cancel({ restoreId: restore._id });
              } catch (error) {
                setCancelling(false);
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "The restore could not be cancelled",
                );
              }
            }}
            variant="outline"
          >
            {cancelling ? <Spinner /> : null}
            Cancel restore
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function SiteEditor(props: SiteEditorProps) {
  return (
    <Suspense fallback={<EditorLoading />}>
      <SiteEditorScreen {...props} />
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
