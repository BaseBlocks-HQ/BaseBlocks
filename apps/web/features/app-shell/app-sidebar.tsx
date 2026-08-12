"use client";

import { useTeamAccess } from "@/features/authentication/team-access";
import { getTeamDashboardPath } from "@/features/dashboard/routes";
import { DashboardSidebarContent } from "@/features/dashboard/layout/dashboard-sidebar";
import { Link } from "@/i18n/navigation";
import { SidebarHeader, SidebarTrigger } from "@baseblocks/ui/sidebar";
import { useTranslations } from "next-intl";
import { AppSidebarFrame } from "./app-sidebar-frame";
import { appSidebarIconSlotClassName } from "./app-sidebar-row";

export function AppSidebar({
  analyticsEnabled,
  siteId,
}: {
  analyticsEnabled: boolean;
  siteId: string | null;
}) {
  const { team } = useTeamAccess();
  const t = useTranslations("navigation");

  return (
    <AppSidebarFrame>
      <SidebarHeader className="shrink-0 p-1">
        <div className="grid h-9 grid-cols-[1rem_1fr_1rem] items-center px-2">
          <Link
            aria-label="BaseBlocks"
            className={appSidebarIconSlotClassName}
            href={getTeamDashboardPath(team.slug)}
            prefetch={false}
          >
            {/* biome-ignore lint/performance/noImgElement: This local SVG logo does not need image optimization. */}
            <img
              alt=""
              className="product-brand-mark h-auto w-4"
              height="228"
              src="/brand/baseblocks-mark.svg"
              width="270"
            />
          </Link>
          <SidebarTrigger
            aria-label={t("toggleSidebar")}
            className="col-start-3 size-7 justify-self-center rounded-lg text-sidebar-foreground/55 hover:text-sidebar-foreground"
            title={t("toggleSidebar")}
          />
        </div>
      </SidebarHeader>

      <DashboardSidebarContent
        analyticsEnabled={analyticsEnabled}
        siteId={siteId}
      />
    </AppSidebarFrame>
  );
}
