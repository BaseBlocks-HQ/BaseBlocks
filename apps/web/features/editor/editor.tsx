"use client";

import { cn } from "@baseblocks/ui/lib/utils";
import { EditorProvider, useEditorUi } from "@/features/editor/editor-state";
import { useTeamAccess } from "@/features/authentication/team-access";
import { api } from "@baseblocks/backend";
import type { Doc, Id } from "@baseblocks/backend";
import type { SaveStatus } from "@baseblocks/domain";
import { PortalContainerProvider } from "@baseblocks/ui/contexts/portal-container-context";
import { SiteThemeScope } from "@/components/site-runtime/site-theme-scope";
import { useIsMobile } from "@baseblocks/ui/hooks/use-mobile";
import { Spinner } from "@baseblocks/ui/spinner";
import { useMutation, useQuery } from "convex/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { OpenEditorPageEditor } from "@/features/openeditor/openeditor-page-editor";
import { toast } from "sonner";
import { EditorToolDock } from "./editor-tool-dock";
import { EditorHeader } from "./editor-header";
import {
  type DraftStatus,
  HistoryDialog,
  PublishDialog,
} from "./release-dialogs";

function buildEditorPath(
  pathname: string,
  currentSearchParams: string,
  updates: Record<string, string | null>,
) {
  const params = new URLSearchParams(currentSearchParams);

  for (const [key, value] of Object.entries(updates)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

interface SiteEditorProps {
  siteId: string;
}

function SiteEditorInner({ siteId }: SiteEditorProps) {
  const { team } = useTeamAccess();
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { resetPageHistory } = useEditorUi();
  const selectedPageId = searchParams.get("page");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isToolDockExpanded, setIsToolDockExpanded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const siteQuery = useQuery(api.sites.get, {
    siteId: siteId as Id<"sites">,
  });
  const pagesQuery = useQuery(api.pages.list, {
    siteId: siteId as Id<"sites">,
  });
  const draftStatusQuery = useQuery(api.releases.getDraftStatus, {
    siteId: siteId as Id<"sites">,
  });
  const site = siteQuery;
  const pages = pagesQuery;

  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null,
  );

  const unpublishSite = useMutation(api.releases.unpublish);

  const handleUnpublish = async () => {
    try {
      await unpublishSite({
        siteId: siteId as Id<"sites">,
      });
      toast.success("Site unpublished");
    } catch (_error) {
      toast.error("Failed to unpublish site");
    }
  };

  const replaceEditorUrl = (updates: Record<string, string | null>) => {
    const nextUrl = buildEditorPath(pathname, searchParams.toString(), updates);
    router.replace(nextUrl, { scroll: false });
  };

  const setSelectedPageId = (id: string | null) => {
    resetPageHistory();
    replaceEditorUrl({ page: id });
  };

  const selectedPage = selectedPageId
    ? (pages?.find((p: Doc<"pages">) => p._id === selectedPageId) ?? pages?.[0])
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
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Site not found</p>
      </div>
    );
  }
  const draftStatus = draftStatusQuery as DraftStatus;

  const pageEditor = selectedPage ? (
    <OpenEditorPageEditor
      key={selectedPage._id}
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

  const themedPageEditor = (
    <SiteThemeScope
      className="min-h-full rounded-2xl"
      theme={site.settings.theme}
    >
      {pageEditor}
    </SiteThemeScope>
  );

  const editorCanvas = (
    <div
      className={cn(
        "h-full min-h-0 overflow-auto lg:pl-0",
        isToolDockExpanded ? "md:pl-0" : "md:pl-14",
      )}
    >
      <div className="p-4 pt-18 md:p-8 md:pt-18">{themedPageEditor}</div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="w-full bg-background">
        <EditorToolDock
          expanded={isToolDockExpanded}
          site={site}
          pages={pages}
          selectedPageId={selectedPage?._id}
          onSelectPage={setSelectedPageId}
          onExpandedChange={setIsToolDockExpanded}
        />
        <div
          ref={setPortalContainer}
          className="pointer-events-none fixed inset-0 z-50 [&>*]:pointer-events-auto"
        />
        <main className="relative min-w-0 w-full overflow-hidden">
          <EditorHeader
            inFlow
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
            liveReleaseNumber={draftStatus.liveRelease?.number}
          />
          <PortalContainerProvider value={portalContainer ?? undefined}>
            <div className="overflow-visible p-4 pb-20">{themedPageEditor}</div>
          </PortalContainerProvider>
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
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <EditorToolDock
        expanded={isToolDockExpanded}
        site={site}
        pages={pages}
        selectedPageId={selectedPage?._id}
        onSelectPage={setSelectedPageId}
        onExpandedChange={setIsToolDockExpanded}
      />
      <div
        ref={setPortalContainer}
        className="pointer-events-none fixed inset-0 z-50 [&>*]:pointer-events-auto"
      />
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <EditorHeader
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
          liveReleaseNumber={draftStatus.liveRelease?.number}
        />

        <PortalContainerProvider value={portalContainer ?? undefined}>
          <div
            className={cn(
              "absolute inset-0 min-w-0 overflow-hidden transition-[margin] duration-200 ease-out",
              isToolDockExpanded && "md:ml-[18.5rem] lg:ml-[24.25rem]",
            )}
          >
            {editorCanvas}
          </div>
        </PortalContainerProvider>
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
      </main>
    </div>
  );
}

function SiteEditorShell({
  permissions,
  siteId,
}: SiteEditorProps & {
  permissions: {
    canEdit: boolean;
    isAdmin: boolean;
    isLoading: boolean;
  };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pageHistory, setPageHistory] = useState<(string | null)[]>([]);

  const replaceEditorUrl = (updates: Record<string, string | null>) => {
    const nextUrl = buildEditorPath(pathname, searchParams.toString(), updates);
    router.replace(nextUrl, { scroll: false });
  };

  const openPage = (pageId: string) => {
    const currentPageId = searchParams.get("page");
    if (currentPageId === pageId) return;
    setPageHistory((current) => [...current, currentPageId]);
    replaceEditorUrl({ page: pageId });
  };

  const goBack = () => {
    if (pageHistory.length === 0) return;
    const previousPageId = pageHistory.at(-1) ?? null;
    setPageHistory((current) => current.slice(0, -1));
    replaceEditorUrl({ page: previousPageId });
  };

  const resetPageHistory = () => setPageHistory([]);

  return (
    <EditorProvider
      siteId={siteId}
      permissions={permissions}
      canGoBack={pageHistory.length > 0}
      onGoBack={goBack}
      onOpenPage={openPage}
      onResetPageHistory={resetPageHistory}
    >
      <SiteEditorInner siteId={siteId} />
    </EditorProvider>
  );
}

export function SiteEditor({ siteId }: SiteEditorProps) {
  const { capabilities } = useTeamAccess();
  const siteQuery = useQuery(api.sites.get, {
    siteId: siteId as Id<"sites">,
  });
  const site = siteQuery;

  const permissions = {
    canEdit: capabilities.canEditContent,
    isAdmin: capabilities.canManageTeam,
    isLoading: site === undefined,
  };

  return (
    <Suspense fallback={<EditorLoading />}>
      <SiteEditorShell permissions={permissions} siteId={siteId} />
    </Suspense>
  );
}

function EditorLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}
