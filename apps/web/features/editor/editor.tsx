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
import { Suspense, useCallback, useState } from "react";
import { OpenEditorPageEditor } from "@/features/openeditor/openeditor-page-editor";
import { toast } from "sonner";
import { EditorToolDock } from "./tool-dock/editor-tool-dock";
import { EditorHeader } from "./editor-header";

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

  const siteQuery = useQuery(api.sites.get, {
    siteId: siteId as Id<"sites">,
  });
  const pagesQuery = useQuery(api.pages.list, {
    siteId: siteId as Id<"sites">,
  });
  const site = siteQuery;
  const pages = pagesQuery;

  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null,
  );

  const publishSite = useMutation(api.sites.publish);
  const unpublishSite = useMutation(api.sites.unpublish);

  const handlePublish = async () => {
    try {
      await publishSite({ siteId: siteId as Id<"sites"> });
      toast.success("Site published");
    } catch (_error) {
      toast.error("Failed to publish site");
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublishSite({ siteId: siteId as Id<"sites"> });
      toast.success("Site unpublished");
    } catch (_error) {
      toast.error("Failed to unpublish site");
    }
  };

  const replaceEditorUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const nextUrl = buildEditorPath(
        pathname,
        searchParams.toString(),
        updates,
      );
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setSelectedPageId = (id: string | null) => {
    resetPageHistory();
    replaceEditorUrl({ page: id });
  };

  const selectedPage = selectedPageId
    ? (pages?.find((p: Doc<"pages">) => p._id === selectedPageId) ?? pages?.[0])
    : pages?.[0];

  if (site === undefined || pages === undefined) {
    return <EditorLoading />;
  }

  if (!site || site.organizationId !== team._id) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Site not found</p>
      </div>
    );
  }

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
            sitePublished={site.isPublished}
            siteName={site.name}
            siteLogoUrl={site.logoUrl}
            saveStatus={saveStatus}
            onPublish={handlePublish}
            isPreviewing={isPreviewing}
            onTogglePreview={() => setIsPreviewing((current) => !current)}
            onUnpublish={handleUnpublish}
          />
          <PortalContainerProvider value={portalContainer ?? undefined}>
            <div className="overflow-visible p-4 pb-20">{themedPageEditor}</div>
          </PortalContainerProvider>
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
          sitePublished={site.isPublished}
          siteName={site.name}
          siteLogoUrl={site.logoUrl}
          saveStatus={saveStatus}
          onPublish={handlePublish}
          isPreviewing={isPreviewing}
          onTogglePreview={() => setIsPreviewing((current) => !current)}
          onUnpublish={handleUnpublish}
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

  const replaceEditorUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const nextUrl = buildEditorPath(
        pathname,
        searchParams.toString(),
        updates,
      );
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openPage = useCallback(
    (pageId: string) => {
      const currentPageId = searchParams.get("page");
      if (currentPageId === pageId) return;
      setPageHistory((current) => [...current, currentPageId]);
      replaceEditorUrl({ page: pageId });
    },
    [replaceEditorUrl, searchParams],
  );

  const goBack = useCallback(() => {
    if (pageHistory.length === 0) return;
    const previousPageId = pageHistory.at(-1) ?? null;
    setPageHistory((current) => current.slice(0, -1));
    replaceEditorUrl({ page: previousPageId });
  }, [pageHistory, replaceEditorUrl]);

  const resetPageHistory = useCallback(() => setPageHistory([]), []);

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
