"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Add01Icon,
  Analytics01Icon,
  ArrowLeft01Icon,
  CorporateIcon,
  CreditCardIcon,
  Home01Icon,
  InboxIcon,
  Link01Icon,
  UserCircleIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { AppSidebarFooter } from "@/features/app-shell/app-sidebar-footer";
import { WorkspaceSiteNavigation } from "@/features/app-shell/workspace-site-navigation";
import { CreateSiteDialog } from "@/features/dashboard/sites/create-site-dialog";
import { useSiteNavigation } from "@/features/dashboard/use-site-navigation";
import { Link, usePathname } from "@/i18n/navigation";
import {
  getTeamAnalyticsPath,
  getTeamAccountSettingsPath,
  getTeamBillingPath,
  getTeamDashboardPath,
  getTeamIntegrationsPath,
  getTeamInboxPath,
  getTeamMembersPath,
  getTeamOrganizationsSettingsPath,
  getTeamSettingsPath,
} from "@/features/dashboard/routes";
import { useTeamAccess } from "@/features/authentication/team-access";
import {
  APP_SIDEBAR_ICON_STROKE,
  appSidebarIconClassName,
  appSidebarIconSlotClassName,
  appSidebarRowClassName,
  appSidebarRowGapClassName,
} from "@/features/app-shell/app-sidebar-row";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@baseblocks/ui/sidebar";
import { useTranslations } from "next-intl";

export function DashboardSidebarContent({
  analyticsEnabled,
  siteId,
}: {
  analyticsEnabled: boolean;
  siteId: string | null;
}) {
  const pathname = usePathname();
  const t = useTranslations();
  const billingT = useTranslations("billing");
  const { capabilities, team } = useTeamAccess();
  const teamMembersPath = getTeamMembersPath(team.slug);
  const teamIntegrationsPath = getTeamIntegrationsPath(team.slug);
  const teamAnalyticsPath = getTeamAnalyticsPath(team.slug);
  const teamBillingPath = getTeamBillingPath(team.slug);
  const teamInboxPath = getTeamInboxPath(team.slug);
  const teamSettingsPath = getTeamSettingsPath(team.slug);
  const teamAccountSettingsPath = getTeamAccountSettingsPath(team.slug);
  const teamOrganizationsSettingsPath = getTeamOrganizationsSettingsPath(
    team.slug,
  );
  const sites = useSiteNavigation(team._id);
  const isSettingsRoute = pathname.startsWith(teamSettingsPath);

  return (
    <>
      <SidebarContent className="min-h-0 flex-1 gap-0 overflow-x-visible overflow-y-hidden p-1">
        <div className="h-full min-h-0 overflow-y-auto [scrollbar-gutter:stable]">
          {isSettingsRoute ? (
            <SidebarGroup className="p-0">
              <SidebarGroupContent>
                <SidebarMenu className={appSidebarRowGapClassName}>
                  <SidebarNavigationItem
                    href={getTeamDashboardPath(team.slug)}
                    icon={ArrowLeft01Icon}
                    isActive={false}
                    label={t("common.back")}
                  />
                  <SidebarNavigationItem
                    href={teamAccountSettingsPath}
                    icon={UserCircleIcon}
                    isActive={pathname === teamAccountSettingsPath}
                    label={t("settings.accountNav")}
                  />
                  <SidebarNavigationItem
                    href={teamOrganizationsSettingsPath}
                    icon={CorporateIcon}
                    isActive={pathname === teamOrganizationsSettingsPath}
                    label={t("settings.organizationsNav")}
                  />
                  <SidebarNavigationItem
                    href={teamMembersPath}
                    icon={UserGroupIcon}
                    isActive={pathname.startsWith(teamMembersPath)}
                    label={t("team.title")}
                  />
                  <SidebarNavigationItem
                    href={teamBillingPath}
                    icon={CreditCardIcon}
                    isActive={pathname.startsWith(teamBillingPath)}
                    label={billingT("title")}
                  />
                  <SidebarNavigationItem
                    href={teamIntegrationsPath}
                    icon={Link01Icon}
                    isActive={pathname.startsWith(teamIntegrationsPath)}
                    label={t("integrations.title")}
                  />
                  {analyticsEnabled ? (
                    <SidebarNavigationItem
                      href={teamAnalyticsPath}
                      icon={Analytics01Icon}
                      isActive={pathname.startsWith(teamAnalyticsPath)}
                      label={t("navigation.analytics")}
                    />
                  ) : null}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : (
            <SidebarGroup className="p-0">
              <SidebarGroupContent>
                <SidebarMenu className={appSidebarRowGapClassName}>
                  <SidebarNavigationItem
                    href={getTeamDashboardPath(team.slug)}
                    icon={Home01Icon}
                    isActive={pathname === getTeamDashboardPath(team.slug)}
                    label={t("navigation.dashboard")}
                  />
                  <SidebarNavigationItem
                    href={teamInboxPath}
                    icon={InboxIcon}
                    isActive={pathname === teamInboxPath}
                    label={t("inbox.title")}
                  />
                  {capabilities.canManageSites ? (
                    <SidebarMenuItem>
                      <CreateSiteDialog
                        organizationId={team._id}
                        trigger={
                          <SidebarMenuButton
                            className={cn(
                              appSidebarRowClassName,
                              "text-sidebar-foreground/60",
                            )}
                            type="button"
                          >
                            <span className={appSidebarIconSlotClassName}>
                              <HugeiconsIcon
                                aria-hidden
                                className={appSidebarIconClassName}
                                icon={Add01Icon}
                                strokeWidth={APP_SIDEBAR_ICON_STROKE}
                              />
                            </span>
                            <span>{t("dashboard.createSite")}</span>
                          </SidebarMenuButton>
                        }
                      />
                    </SidebarMenuItem>
                  ) : null}
                  <WorkspaceSiteNavigation
                    activeSiteId={siteId}
                    sites={sites}
                  />
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </div>
      </SidebarContent>

      <AppSidebarFooter />
    </>
  );
}

function SidebarNavigationItem({
  href,
  icon,
  isActive,
  label,
}: {
  href: string;
  icon: IconSvgElement;
  isActive: boolean;
  label: string;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        className={appSidebarRowClassName}
        isActive={isActive}
      >
        <Link href={href} prefetch={false}>
          <span className={appSidebarIconSlotClassName}>
            <HugeiconsIcon
              icon={icon}
              className={cn(
                appSidebarIconClassName,
                isActive ? "text-sidebar-foreground" : undefined,
              )}
              strokeWidth={APP_SIDEBAR_ICON_STROKE}
            />
          </span>
          <span className="truncate">{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
