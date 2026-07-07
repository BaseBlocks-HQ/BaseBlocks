"use client";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { authClient } from "@/lib/auth/client";
import type { Locale } from "@baseblocks/i18n";
import {
  getTeamDashboardPath,
  getTeamLibrariesPath,
  getTeamMembersPath,
} from "@/lib/routes/team-routes";
import { AccountSettings } from "@/modules/dashboard/components/account-settings";
import { InvitationInbox } from "@/modules/dashboard/components/invitation-inbox";
import {
  HouseNoDoorIcon,
  SIDEBAR_ICON_STROKE,
} from "@/modules/dashboard/sidebar-lucide";
import { useTeamAccess } from "@/modules/dashboard/team/team-access";
import { Avatar, AvatarFallback, AvatarImage } from "@baseblocks/ui/avatar";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import {
  Bolt,
  Building,
  Check,
  ChevronsUpDown,
  Earth,
  FolderPlus,
  LogOut,
  type LucideIcon,
  UsersRound,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { type SVGProps, useState } from "react";

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

function ThemeLightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M8.21 2.109a.256.256 0 0 0-.42 0L6.534 3.893a.256.256 0 0 1-.316.085l-1.982-.917a.256.256 0 0 0-.362.21l-.196 2.174a.256.256 0 0 1-.232.232l-2.175.196a.256.256 0 0 0-.209.362l.917 1.982a.256.256 0 0 1-.085.316L.11 9.791a.256.256 0 0 0 0 .418L1.23 11H3.1a5 5 0 1 1 9.8 0h1.869l1.123-.79a.256.256 0 0 0 0-.42l-1.785-1.257a.256.256 0 0 1-.085-.316l.917-1.982a.256.256 0 0 0-.21-.362l-2.174-.196a.256.256 0 0 1-.232-.232l-.196-2.175a.256.256 0 0 0-.362-.209l-1.982.917a.256.256 0 0 1-.316-.085z" />
      <path d="M4 10q.001.519.126 1h7.748A4 4 0 1 0 4 10M.75 12a.75.75 0 0 0 0 1.5h14.5a.75.75 0 0 0 0-1.5z" />
    </svg>
  );
}

function ThemeDarkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M10.794 3.647a.217.217 0 0 1 .412 0l.387 1.162c.173.518.58.923 1.097 1.096l1.162.388a.217.217 0 0 1 0 .412l-1.162.386a1.73 1.73 0 0 0-1.097 1.097l-.387 1.162a.217.217 0 0 1-.412 0l-.387-1.162A1.74 1.74 0 0 0 9.31 7.092l-1.162-.386a.217.217 0 0 1 0-.412l1.162-.388a1.73 1.73 0 0 0 1.097-1.096zM13.863.598a.144.144 0 0 1 .221-.071.14.14 0 0 1 .053.07l.258.775c.115.345.386.616.732.731l.774.258a.145.145 0 0 1 0 .274l-.774.259a1.16 1.16 0 0 0-.732.732l-.258.773a.145.145 0 0 1-.274 0l-.258-.773a1.16 1.16 0 0 0-.732-.732l-.774-.259a.145.145 0 0 1 0-.273l.774-.259c.346-.115.617-.386.732-.732z" />
      <path d="M6.25 1.742a.67.67 0 0 1 .07.75 6.3 6.3 0 0 0-.768 3.028c0 2.746 1.746 5.084 4.193 5.979H1.774A7.2 7.2 0 0 1 1 8.245c0-3.013 1.85-5.598 4.484-6.694a.66.66 0 0 1 .766.19M.75 12.499a.75.75 0 0 0 0 1.5h14.5a.75.75 0 0 0 0-1.5z" />
    </svg>
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const { setTheme, theme, resolvedTheme } = useTheme();
  const { team, teams, user } = useTeamAccess();
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);

  const teamMembersPath = getTeamMembersPath(team.slug);

  type NavIcon = LucideIcon | typeof HouseNoDoorIcon;

  const navItems: {
    title: string;
    href: string;
    icon: NavIcon;
    isActive: boolean;
  }[] = [
    {
      title: t("navigation.dashboard"),
      href: getTeamDashboardPath(team.slug),
      icon: HouseNoDoorIcon,
      isActive: pathname === getTeamDashboardPath(team.slug),
    },
    {
      title: t("libraries.title"),
      href: getTeamLibrariesPath(team.slug),
      icon: FolderPlus,
      isActive: pathname.startsWith(getTeamLibrariesPath(team.slug)),
    },
    {
      title: t("team.title"),
      href: teamMembersPath,
      icon: UsersRound,
      isActive: pathname.startsWith(teamMembersPath),
    },
  ];

  const themeSummary =
    theme === "system"
      ? t("common.themeSystem")
      : resolvedTheme === "dark"
        ? t("common.themeDark")
        : t("common.themeLight");

  const ThemeIcon = resolvedTheme === "dark" ? ThemeDarkIcon : ThemeLightIcon;

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
                        <item.icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            item.isActive
                              ? undefined
                              : "text-sidebar-foreground/55",
                          )}
                          strokeWidth={SIDEBAR_ICON_STROKE}
                        />
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
                      <Building
                        className="h-4 w-4 shrink-0 text-sidebar-foreground/55"
                        strokeWidth={SIDEBAR_ICON_STROKE}
                      />
                      <span className="truncate">{team.name}</span>
                    </span>
                    <ChevronsUpDown
                      className="h-4 w-4 shrink-0 text-sidebar-foreground/50"
                      strokeWidth={SIDEBAR_ICON_STROKE}
                    />
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
                          <Check
                            className="h-4 w-4"
                            strokeWidth={SIDEBAR_ICON_STROKE}
                          />
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
                  <ChevronsUpDown
                    className="h-4 w-4 shrink-0 text-sidebar-foreground/50"
                    strokeWidth={SIDEBAR_ICON_STROKE}
                  />
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

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="w-full gap-2">
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <Earth
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                        strokeWidth={SIDEBAR_ICON_STROKE}
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
                          <Check
                            className="ml-auto h-4 w-4 text-muted-foreground"
                            strokeWidth={SIDEBAR_ICON_STROKE}
                          />
                        ) : null}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="w-full gap-2">
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <ThemeIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
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

                <DropdownMenuItem onSelect={() => setAccountSettingsOpen(true)}>
                  <Bolt
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    strokeWidth={SIDEBAR_ICON_STROKE}
                  />
                  <span>{t("common.settings")}</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleLogout} variant="destructive">
                  <LogOut
                    className="h-4 w-4 shrink-0"
                    strokeWidth={SIDEBAR_ICON_STROKE}
                  />
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
