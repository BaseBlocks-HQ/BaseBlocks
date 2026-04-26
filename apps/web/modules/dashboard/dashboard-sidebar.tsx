"use client";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";
import { authClient } from "@/lib/auth/client";
import {
  getTeamDashboardPath,
  getTeamLibrariesPath,
  getTeamMembersPath,
} from "@/lib/routes/team-routes";
import { AccountSettings } from "@/modules/dashboard/components/account-settings";
import { InvitationInbox } from "@/modules/dashboard/components/invitation-inbox";
import { useTeamAccess } from "@/modules/team/team-access";
import { Avatar, AvatarFallback, AvatarImage } from "@baseblocks/ui/avatar";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { cn } from "@baseblocks/ui/lib/utils";
import { nestedCardRadiusClass } from "@baseblocks/ui/nested-card";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
} from "@baseblocks/ui/sidebar";
import { Check, ChevronsUpDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import {
  IconBrightnessIncrease,
  IconCirclePowerOff,
  IconCloudBolt,
  IconFolder,
  IconGear,
  IconHouse,
  IconLocation,
  IconUsers,
} from "nucleo-glass";
import { useState } from "react";

const sidebarFloatingInnerClass =
  "[&_[data-slot=sidebar-inner]]:rounded-[1.35rem] [&_[data-slot=sidebar-inner]]:border-sidebar-border/80 [&_[data-slot=sidebar-inner]]:!bg-sidebar/95 [&_[data-slot=sidebar-inner]]:text-sidebar-foreground [&_[data-slot=sidebar-inner]]:shadow-lg [&_[data-slot=sidebar-inner]]:backdrop-blur-md sm:[&_[data-slot=sidebar-inner]]:rounded-[1.5rem]";

const pillRowClass = cn(
  "flex h-10 w-full items-center justify-start gap-2.5 border border-transparent px-2.5 text-[13px] font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/55 hover:text-sidebar-accent-foreground",
  nestedCardRadiusClass,
);

const navActiveClass =
  "border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground shadow-sm";

const languageNames: Record<Locale, string> = {
  en: "English",
  fr: "Français",
};

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const { setTheme, theme, resolvedTheme } = useTheme();
  const { team, teams, user } = useTeamAccess();
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);

  const teamMembersPath = getTeamMembersPath(team.slug);

  const navItems = [
    {
      title: t("navigation.dashboard"),
      href: getTeamDashboardPath(team.slug),
      icon: IconHouse,
      isActive: pathname === getTeamDashboardPath(team.slug),
    },
    {
      title: t("libraries.title"),
      href: getTeamLibrariesPath(team.slug),
      icon: IconFolder,
      isActive: pathname.startsWith(getTeamLibrariesPath(team.slug)),
    },
    {
      title: t("team.title"),
      href: teamMembersPath,
      icon: IconUsers,
      isActive: pathname.startsWith(teamMembersPath),
    },
  ];

  const themeSummary =
    theme === "system"
      ? t("common.themeSystem")
      : resolvedTheme === "dark"
        ? t("common.themeDark")
        : t("common.themeLight");

  const ThemeIcon =
    resolvedTheme === "dark" ? IconCloudBolt : IconBrightnessIncrease;

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  const handleLocaleChange = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
  };

  const profileLabel = user?.name || user?.email || team.name;
  const profileFallback = (user?.name?.[0] || user?.email?.[0] || "U")
    .toUpperCase()
    .slice(0, 1);

  return (
    <Sidebar
      className={cn(
        "min-h-svh [--sidebar-width:14.5rem]",
        sidebarFloatingInnerClass,
      )}
      collapsible="offcanvas"
      variant="floating"
    >
      <SidebarContent className="min-h-0 flex-1 gap-0 overflow-x-visible overflow-y-hidden p-1.5">
        <ScrollArea className="min-h-0 h-full">
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <Button
                      asChild
                      className={cn(
                        pillRowClass,
                        item.isActive && navActiveClass,
                      )}
                      variant="ghost"
                    >
                      <Link href={item.href} title={item.title}>
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </Button>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="mt-auto shrink-0 border-0 p-1.5">
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <InvitationInbox
              fullWidth
              fullWidthTriggerClassName={pillRowClass}
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div className="space-y-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(pillRowClass, "justify-between")}
                    type="button"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <IconUsers className="h-4 w-4 shrink-0" />
                      <span className="truncate">{team.name}</span>
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-foreground/50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60 rounded-xl">
                  {teams.map((workspace) => (
                    <DropdownMenuItem
                      key={workspace._id}
                      className="rounded-lg"
                      onClick={() =>
                        router.push(getTeamDashboardPath(workspace.slug))
                      }
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
                          <Check className="h-4 w-4" />
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(pillRowClass, "justify-between text-left")}
                  type="button"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Avatar className="h-6 w-6 rounded-full">
                      {user?.imageUrl ? (
                        <AvatarImage src={user.imageUrl} />
                      ) : null}
                      <AvatarFallback className="text-[10px]">
                        {profileFallback}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 truncate text-sidebar-foreground">
                      {profileLabel}
                    </span>
                  </span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-foreground/50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 rounded-xl">
                <DropdownMenuLabel className="px-2 py-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar className="h-7 w-7 rounded-full">
                      {user?.imageUrl ? (
                        <AvatarImage src={user.imageUrl} />
                      ) : null}
                      <AvatarFallback className="text-[10px]">
                        {profileFallback}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {user?.name || t("common.settings")}
                      </p>
                      {user?.email ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="w-full gap-2">
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <IconLocation className="h-4 w-4 shrink-0" />
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
                          <Check className="ml-auto h-4 w-4 text-muted-foreground" />
                        ) : null}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="w-full gap-2">
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <ThemeIcon className="h-4 w-4 shrink-0" />
                      <span>{t("common.themeMenu")}</span>
                    </span>
                    <span className="w-[7rem] shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                      {themeSummary}
                    </span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setTheme("light")}>
                      {t("common.themeLight")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                      {t("common.themeDark")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("system")}>
                      {t("common.themeSystem")}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />

                <DropdownMenuItem onSelect={() => setAccountSettingsOpen(true)}>
                  <IconGear className="h-4 w-4 shrink-0" />
                  <span>{t("common.settings")}</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleLogout} variant="destructive">
                  <IconCirclePowerOff className="h-4 w-4 shrink-0" />
                  <span>{t("common.signOut")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <AccountSettings
        open={accountSettingsOpen}
        onOpenChange={setAccountSettingsOpen}
        showTrigger={false}
        user={user}
      />
    </Sidebar>
  );
}
