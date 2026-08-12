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
  useEditorUi,
  useEditorWorkspace,
} from "@/features/editor/editor-state";
import { useRouter } from "@/i18n/navigation";
import { SidebarMenuItem } from "@baseblocks/ui/sidebar";
import { Spinner } from "@baseblocks/ui/spinner";
import { useState } from "react";

export function WorkspaceSiteNavigation({
  activeSiteId,
  sites,
}: {
  activeSiteId: string | null;
  sites: SiteNavigationItem[] | undefined;
}) {
  const router = useRouter();
  const { capabilities, team } = useTeamAccess();
  const { selectPage } = useEditorUi();
  const { selectedPageId } = useEditorWorkspace();
  const [siteManagement, setSiteManagement] = useState<{
    action: "delete" | "edit";
    site: SiteManagementTarget;
  } | null>(null);

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
          canEdit={capabilities.canEditContent}
          canManageSites={capabilities.canManageSites}
          onDeleteSite={(target) =>
            setSiteManagement({ action: "delete", site: target })
          }
          onEditSite={(target) =>
            setSiteManagement({ action: "edit", site: target })
          }
          onSelectActivePage={selectPage}
          selectedPageId={selectedPageId}
          site={site}
          teamSlug={team.slug}
        />
      ))}
      {siteManagement ? (
        <SiteManagementDialogs
          deleteOpen={siteManagement.action === "delete"}
          editOpen={siteManagement.action === "edit"}
          onDeleteOpenChange={(open) => {
            if (!open) setSiteManagement(null);
          }}
          onDeleted={() => {
            if (siteManagement.site._id === activeSiteId) {
              router.replace(getTeamDashboardPath(team.slug));
            }
          }}
          onEditOpenChange={(open) => {
            if (!open) setSiteManagement(null);
          }}
          site={siteManagement.site}
        />
      ) : null}
    </>
  );
}
