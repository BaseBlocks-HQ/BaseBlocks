"use client";

import { PagesPanel } from "@/features/editor/pages-panel";
import { useEditorSite, useEditorUi } from "@/features/editor/editor-state";
import {
  APP_SIDEBAR_ICON_STROKE,
  appSidebarIconClassName,
  appSidebarRowClassName,
} from "@/features/app-shell/app-sidebar-row";
import { getTeamDashboardPath } from "@/features/dashboard/routes";
import { useTeamAccess } from "@/features/authentication/team-access";
import { Link } from "@/i18n/navigation";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import {
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@baseblocks/ui/sidebar";
import { Spinner } from "@baseblocks/ui/spinner";
import { useQuery } from "convex/react";
import { ArrowLeft, Astroid } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

export function SiteEditorSidebarContent({ siteId }: { siteId: string }) {
  const { team } = useTeamAccess();
  const { canEdit } = useEditorSite();
  const { selectPage } = useEditorUi();
  const searchParams = useSearchParams();
  const site = useQuery(api.sites.get, {
    siteId: siteId as Id<"sites">,
  });
  const pages = useQuery(api.pages.list, {
    siteId: siteId as Id<"sites">,
  });

  if (site === undefined || pages === undefined) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Spinner className="size-5 text-sidebar-foreground/45" />
      </div>
    );
  }

  if (!site || site.organizationId !== team._id) return null;

  const requestedPageId = searchParams.get("page");
  const selectedPageId =
    pages.find((page) => page._id === requestedPageId)?._id ?? pages[0]?._id;

  return (
    <>
      <SidebarContent className="min-h-0 flex-1 gap-0 overflow-y-auto px-1 py-1">
        <div>
          <SidebarMenu className="gap-px">
            <SidebarMenuItem>
              <SidebarMenuButton asChild className={appSidebarRowClassName}>
                <Link href={getTeamDashboardPath(team.slug)} prefetch={false}>
                  <ArrowLeft
                    aria-hidden
                    className={appSidebarIconClassName}
                    strokeWidth={APP_SIDEBAR_ICON_STROKE}
                  />
                  <span>Back</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>

        <PagesPanel
          canEdit={canEdit}
          onSelectPage={selectPage}
          pages={pages}
          selectedPageId={selectedPageId}
          site={site}
        />
      </SidebarContent>
      <EditorBetaCard />
    </>
  );
}

function EditorBetaCard() {
  const t = useTranslations("editor.header.beta");

  return (
    <SidebarFooter className="mt-auto shrink-0 border-0 p-1">
      <div className="rounded-lg bg-sidebar-accent/55 p-2.5 text-sidebar-foreground">
        <div className="flex items-center gap-1.5">
          <Astroid
            aria-hidden
            className="size-3.5 shrink-0 text-sidebar-foreground/60"
            strokeWidth={1.75}
          />
          <p className="min-w-0 flex-1 truncate text-xs font-medium">
            {t("label")}
          </p>
          <span className="shrink-0 rounded bg-sidebar-foreground/[0.07] px-1.5 py-0.5 text-[0.625rem] leading-none font-semibold tracking-wide text-sidebar-foreground/55 uppercase">
            {t("badge")}
          </span>
        </div>
        <p className="mt-2 text-[0.6875rem] leading-4 text-sidebar-foreground/58">
          {t("description")}
        </p>
      </div>
    </SidebarFooter>
  );
}
