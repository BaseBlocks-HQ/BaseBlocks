"use client";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  productPaletteIds,
  useProductAppearance,
  type ProductPaletteId,
} from "@/components/theme-provider";
import { routing } from "@/i18n/routing";
import { authClient } from "@/lib/auth/client";
import type { Locale } from "@baseblocks/i18n";
import {
  getSiteThemePreviewColors,
  siteThemeStyleIds,
  type SiteThemeStyleId,
} from "@baseblocks/domain";
import {
  getTeamDashboardPath,
  getTeamLibrariesPath,
  getTeamMembersPath,
} from "@/features/dashboard/routes";
import { useTeamAccess } from "@/features/authentication/team-access";
import { Avatar, AvatarFallback, AvatarImage } from "@baseblocks/ui/avatar";
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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@baseblocks/ui/sidebar";
import {
  Bolt,
  Building,
  Check,
  ChevronsUpDown,
  Earth,
  FolderPlus,
  House,
  LogOut,
  Moon,
  Sun,
  type LucideIcon,
  UsersRound,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { useState } from "react";

const AccountSettings = dynamic(() =>
  import("@/features/dashboard/account-settings").then(
    (module) => module.AccountSettings,
  ),
);
const InvitationInbox = dynamic(() =>
  import("@/features/dashboard/invitation-inbox").then(
    (module) => module.InvitationInbox,
  ),
);

const SIDEBAR_ICON_STROKE = 1.75;

const sidebarFloatingInnerClass =
  "[&_[data-slot=sidebar-inner]]:rounded-xl [&_[data-slot=sidebar-inner]]:border-sidebar-border/60 [&_[data-slot=sidebar-inner]]:!bg-sidebar/95 [&_[data-slot=sidebar-inner]]:text-sidebar-foreground [&_[data-slot=sidebar-inner]]:shadow-sm [&_[data-slot=sidebar-inner]]:backdrop-blur-md";

const pillRowClass = cn(
  "flex h-9 w-full items-center justify-start gap-2 border-0 px-2 text-[13px] font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent/45 hover:text-sidebar-accent-foreground",
  "rounded-lg",
);

const navActiveClass = "bg-sidebar-accent/70 text-sidebar-accent-foreground";

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
  const {
    palette: productPalette,
    setPalette: setProductPalette,
    setStyle: setProductStyle,
    style: productStyle,
  } = useProductAppearance();
  const { team, teams, user } = useTeamAccess();
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);

  const teamMembersPath = getTeamMembersPath(team.slug);

  const navItems: {
    title: string;
    href: string;
    icon: LucideIcon;
    isActive: boolean;
  }[] = [
    {
      title: t("navigation.dashboard"),
      href: getTeamDashboardPath(team.slug),
      icon: House,
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

  const ThemeIcon = resolvedTheme === "dark" ? Moon : Sun;
  const paletteLabels: Record<ProductPaletteId, string> = {
    neutral: t("common.themeNeutral"),
    amber: t("common.themeAmber"),
    blue: t("common.themeBlue"),
    green: t("common.themeGreen"),
    violet: t("common.themeViolet"),
    rose: t("common.themeRose"),
  };
  const styleLabels: Record<SiteThemeStyleId, string> = {
    subtle: t("common.themeSubtle"),
    tinted: t("common.themeTinted"),
    vibrant: t("common.themeVibrant"),
  };

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
        "min-h-svh [--sidebar-width:13.5rem]",
        sidebarFloatingInnerClass,
      )}
      collapsible="offcanvas"
      variant="floating"
    >
      <SidebarContent className="min-h-0 flex-1 gap-0 overflow-x-visible overflow-y-hidden p-1">
        <div className="h-full min-h-0 overflow-y-auto">
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={item.isActive}
                      className={cn(
                        pillRowClass,
                        item.isActive && navActiveClass,
                      )}
                    >
                      <Link
                        href={item.href}
                        prefetch={false}
                        title={item.title}
                      >
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
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>

      <SidebarFooter className="mt-auto shrink-0 border-0 p-1">
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
                    <span className="w-[7rem] shrink-0 truncate text-right text-xs text-muted-foreground">
                      {paletteLabels[productPalette]}
                    </span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <span className="flex-1">{t("common.themeMode")}</span>
                        <span className="text-xs text-muted-foreground">
                          {themeSummary}
                        </span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {(["light", "dark", "system"] as const).map((value) => (
                          <DropdownMenuItem
                            key={value}
                            onClick={() => setTheme(value)}
                          >
                            {value === "light"
                              ? t("common.themeLight")
                              : value === "dark"
                                ? t("common.themeDark")
                                : t("common.themeSystem")}
                            {theme === value ? (
                              <Check className="ml-auto size-4 text-muted-foreground" />
                            ) : null}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <span className="flex-1">{t("common.themeColor")}</span>
                        <span className="text-xs text-muted-foreground">
                          {paletteLabels[productPalette]}
                        </span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {productPaletteIds.map((palette) => (
                          <DropdownMenuItem
                            key={palette}
                            onClick={() => setProductPalette(palette)}
                          >
                            <ProductPaletteIndicator
                              palette={palette}
                              style={productStyle}
                            />
                            {paletteLabels[palette]}
                            {productPalette === palette ? (
                              <Check className="ml-auto size-4 text-muted-foreground" />
                            ) : null}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <span className="flex-1">{t("common.themeStyle")}</span>
                        <span className="text-xs text-muted-foreground">
                          {styleLabels[productStyle]}
                        </span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {siteThemeStyleIds.map((style) => (
                          <DropdownMenuItem
                            key={style}
                            onClick={() => setProductStyle(style)}
                          >
                            {styleLabels[style]}
                            {productStyle === style ? (
                              <Check className="ml-auto size-4 text-muted-foreground" />
                            ) : null}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
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
      {accountSettingsOpen ? (
        <AccountSettings
          open
          onOpenChange={setAccountSettingsOpen}
          showTrigger={false}
          user={user}
        />
      ) : null}
    </Sidebar>
  );
}

function ProductPaletteIndicator({
  palette,
  style,
}: {
  palette: ProductPaletteId;
  style: SiteThemeStyleId;
}) {
  const colors = getSiteThemePreviewColors({ palette, style });
  return (
    <span
      aria-hidden
      className="size-3.5 rounded-full border border-black/10 shadow-xs dark:border-white/15"
      style={{ backgroundColor: colors.primary }}
    />
  );
}
