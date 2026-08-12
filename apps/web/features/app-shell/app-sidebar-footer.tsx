"use client";

import { AppSidebarAppearanceMenu } from "@/features/app-shell/app-sidebar-appearance-menu";
import {
  appSidebarIconSlotClassName,
  appSidebarRowClassName,
  appSidebarRowGapClassName,
  APP_SIDEBAR_ICON_STROKE,
} from "@/features/app-shell/app-sidebar-row";
import {
  getTeamAccountSettingsPath,
  getTeamDashboardPath,
  getTeamOrganizationsSettingsPath,
} from "@/features/dashboard/routes";
import { useTeamAccess } from "@/features/authentication/team-access";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { authClient } from "@/lib/auth/client";
import type { Locale } from "@baseblocks/i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@baseblocks/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
} from "@baseblocks/ui/sidebar";
import {
  Add01Icon,
  ArrowDown01Icon,
  CogIcon,
  CorporateIcon,
  LanguageSquareIcon,
  Logout01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useLocale, useTranslations } from "next-intl";

const languageNames: Record<Locale, string> = {
  en: "English",
  fr: "Français",
};

export function AppSidebarFooter() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const { team, teams, user } = useTeamAccess();
  const teamAccountSettingsPath = getTeamAccountSettingsPath(team.slug);
  const teamOrganizationsSettingsPath = getTeamOrganizationsSettingsPath(
    team.slug,
  );
  const profileLabel = user?.name || user?.email || team.name;
  const profileFallback = (user?.name?.[0] || user?.email?.[0] || "U")
    .toUpperCase()
    .slice(0, 1);

  const handleLocaleChange = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
  };

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  return (
    <SidebarFooter className="mt-auto shrink-0 border-0 p-1">
      <SidebarMenu className={appSidebarRowGapClassName}>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  appSidebarRowClassName,
                  "justify-between text-left",
                )}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className={appSidebarIconSlotClassName}>
                    <Avatar className="size-5 rounded-full">
                      {user?.imageUrl ? (
                        <AvatarImage src={user.imageUrl} />
                      ) : null}
                      <AvatarFallback className="text-[10px]">
                        {profileFallback}
                      </AvatarFallback>
                    </Avatar>
                  </span>
                  <span className="min-w-0 truncate text-sidebar-foreground">
                    {profileLabel}
                  </span>
                </span>
                <span className={appSidebarIconSlotClassName}>
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    className="size-3.5 text-sidebar-foreground/45"
                    strokeWidth={APP_SIDEBAR_ICON_STROKE}
                  />
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 rounded-xl">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="w-full gap-2">
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <HugeiconsIcon
                      icon={CorporateIcon}
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      strokeWidth={APP_SIDEBAR_ICON_STROKE}
                    />
                    <span className="min-w-0 truncate">
                      {t("settings.organizationsNav")}
                    </span>
                  </span>
                  <span
                    className="w-[7rem] shrink-0 truncate text-right text-xs text-muted-foreground"
                    title={team.name}
                  >
                    {team.name}
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-60 rounded-xl">
                  {teams.map((workspace) => (
                    <DropdownMenuItem
                      key={workspace._id}
                      className="rounded-lg"
                      title={workspace.name}
                      onClick={() => {
                        void authClient.organization
                          .setActive({ organizationId: workspace._id })
                          .then(() =>
                            router.push(getTeamDashboardPath(workspace.slug)),
                          );
                      }}
                    >
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="block truncate font-medium">
                            {workspace.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {workspace.slug}
                          </span>
                        </div>
                        {workspace._id === team._id && (
                          <HugeiconsIcon
                            icon={Tick01Icon}
                            className="h-4 w-4"
                            strokeWidth={APP_SIDEBAR_ICON_STROKE}
                          />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem
                    className="rounded-lg"
                    onSelect={() => {
                      router.push(teamOrganizationsSettingsPath);
                    }}
                  >
                    <HugeiconsIcon
                      icon={Add01Icon}
                      className="size-4 text-muted-foreground"
                    />
                    <span>{t("settings.organizations.create")}</span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="w-full gap-2">
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <HugeiconsIcon
                      icon={LanguageSquareIcon}
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      strokeWidth={APP_SIDEBAR_ICON_STROKE}
                    />
                    <span>{t("language.menuLabel")}</span>
                  </span>
                  <span className="w-[7rem] shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                    {languageNames[locale]}
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {routing.locales.map((loc) => (
                    <DropdownMenuItem
                      key={loc}
                      className={locale === loc ? "bg-accent" : undefined}
                      onClick={() => handleLocaleChange(loc)}
                    >
                      <span className="mr-1">{languageNames[loc]}</span>
                      {locale === loc ? (
                        <HugeiconsIcon
                          icon={Tick01Icon}
                          className="ml-auto h-4 w-4 text-muted-foreground"
                          strokeWidth={APP_SIDEBAR_ICON_STROKE}
                        />
                      ) : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <AppSidebarAppearanceMenu />

              <DropdownMenuItem
                onSelect={() => {
                  router.push(teamAccountSettingsPath);
                }}
              >
                <HugeiconsIcon
                  icon={CogIcon}
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  strokeWidth={APP_SIDEBAR_ICON_STROKE}
                />
                <span>{t("common.settings")}</span>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleLogout} variant="destructive">
                <HugeiconsIcon
                  icon={Logout01Icon}
                  className="h-4 w-4 shrink-0"
                  strokeWidth={APP_SIDEBAR_ICON_STROKE}
                />
                <span>{t("common.signOut")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}
