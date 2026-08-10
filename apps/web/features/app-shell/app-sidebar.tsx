"use client";

import { useTeamAccess } from "@/features/authentication/team-access";
import { getTeamDashboardPath } from "@/features/dashboard/routes";
import { DashboardSidebarContent } from "@/features/dashboard/layout/dashboard-sidebar";
import { SiteEditorSidebarContent } from "@/features/editor/site-editor-sidebar";
import { Link } from "@/i18n/navigation";
import { SidebarHeader, SidebarTrigger } from "@baseblocks/ui/sidebar";
import { Spinner } from "@baseblocks/ui/spinner";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { AppSidebarFrame } from "./app-sidebar-frame";

export function AppSidebar({
  analyticsEnabled,
  billingEnabled,
  siteId,
}: {
  analyticsEnabled: boolean;
  billingEnabled: boolean;
  siteId: string | null;
}) {
  const { team } = useTeamAccess();
  const t = useTranslations("navigation");

  return (
    <AppSidebarFrame>
      <SidebarHeader className="shrink-0 p-1">
        <div className="flex h-9 items-center justify-between px-2">
          <Link
            aria-label="BaseBlocks"
            className="flex size-4 items-center justify-center"
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
            className="size-7 rounded-lg text-sidebar-foreground/55 hover:text-sidebar-foreground"
            title={t("toggleSidebar")}
          />
        </div>
      </SidebarHeader>

      {siteId ? (
        <Suspense
          fallback={
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <Spinner className="size-5 text-sidebar-foreground/45" />
            </div>
          }
        >
          <SiteEditorSidebarContent />
        </Suspense>
      ) : (
        <DashboardSidebarContent
          analyticsEnabled={analyticsEnabled}
          billingEnabled={billingEnabled}
        />
      )}
    </AppSidebarFrame>
  );
}
