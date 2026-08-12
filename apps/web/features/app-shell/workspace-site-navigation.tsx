"use client";

import { SiteNavigationGroup } from "@/features/app-shell/site-navigation-group";
import { useTeamAccess } from "@/features/authentication/team-access";
import { getTeamDashboardPath } from "@/features/dashboard/routes";
import {
  SiteManagementDialogs,
  type SiteManagementTarget,
} from "@/features/dashboard/sites/site-management-dialogs";
import type { SiteNavigationItem } from "@/features/dashboard/use-site-navigation";
import {
  sitePreviewStateEvent,
  type SitePreviewState,
} from "@/features/editor/site-action-event";
import {
  useEditorUi,
  useEditorWorkspace,
} from "@/features/editor/editor-state";
import { useRouter } from "@/i18n/navigation";
import { api, type Id } from "@baseblocks/backend";
import { SidebarMenuItem } from "@baseblocks/ui/sidebar";
import { Spinner } from "@baseblocks/ui/spinner";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function WorkspaceSiteNavigation({
  activeSiteId,
  sites,
}: {
  activeSiteId: string | null;
  sites: SiteNavigationItem[] | undefined;
}) {
  const router = useRouter();
  const { analyticsEnabled, capabilities, team } = useTeamAccess();
  const { selectPage } = useEditorUi();
  const { selectedPageId } = useEditorWorkspace();
  const [siteManagement, setSiteManagement] =
    useState<SiteManagementTarget | null>(null);
  const [previewingSiteId, setPreviewingSiteId] = useState<string | null>(null);
  const unpublishSite = useMutation(api.releases.unpublish);

  const handleUnpublish = async (siteId: string) => {
    try {
      await unpublishSite({ siteId: siteId as Id<"sites"> });
      toast.success("Site unpublished");
    } catch (_error) {
      toast.error("Failed to unpublish site");
    }
  };

  useEffect(() => {
    const handlePreviewState = (event: Event) => {
      const { isPreviewing, siteId } = (event as CustomEvent<SitePreviewState>)
        .detail;
      setPreviewingSiteId(isPreviewing ? siteId : null);
    };

    window.addEventListener(sitePreviewStateEvent, handlePreviewState);
    return () =>
      window.removeEventListener(sitePreviewStateEvent, handlePreviewState);
  }, []);

  if (sites === undefined) {
    return (
      <SidebarMenuItem className="flex h-16 items-center justify-center">
        <Spinner className="size-4 text-sidebar-foreground/40" />
      </SidebarMenuItem>
    );
  }

  return (
    <>
      {sites.map((site) => (
        <SiteNavigationGroup
          key={site._id}
          activeSiteId={activeSiteId}
          analyticsEnabled={analyticsEnabled}
          canEdit={capabilities.canEditContent}
          canManageSites={capabilities.canManageSites}
          onDeleteSite={(target) => setSiteManagement(target)}
          onUnpublishSite={handleUnpublish}
          previewing={previewingSiteId === site._id}
          onSelectActivePage={selectPage}
          selectedPageId={selectedPageId}
          site={site}
          teamSlug={team.slug}
        />
      ))}
      {siteManagement ? (
        <SiteManagementDialogs
          deleteOpen
          onDeleteOpenChange={(open) => {
            if (!open) setSiteManagement(null);
          }}
          onDeleted={() => {
            if (siteManagement._id === activeSiteId) {
              router.replace(getTeamDashboardPath(team.slug));
            }
          }}
          site={siteManagement}
        />
      ) : null}
    </>
  );
}
