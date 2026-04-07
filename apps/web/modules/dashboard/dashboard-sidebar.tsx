"use client";

import { LanguageSwitcher } from "@/components/language-switcher";
import { ModeToggle } from "@/components/mode-toggle";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth/client";
import {
  getTeamDashboardPath,
  getTeamLibrariesPath,
  getTeamMembersPath,
} from "@/lib/routes/team-routes";
import { AccountSettings } from "@/modules/dashboard/components/account-settings";
import { InvitationInbox } from "@/modules/dashboard/components/invitation-inbox";
import { useTeamAccess } from "@/modules/team/team-access";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@baseblocks/ui/sidebar";
import { Check, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  IconCirclePowerOff,
  IconFolder,
  IconHouse,
  IconUsers,
} from "nucleo-glass";

const sidebarFloatingInnerClass =
  "[&_[data-slot=sidebar-inner]]:rounded-[1.75rem] [&_[data-slot=sidebar-inner]]:border-border/80 [&_[data-slot=sidebar-inner]]:!bg-background/90 [&_[data-slot=sidebar-inner]]:shadow-xl [&_[data-slot=sidebar-inner]]:backdrop-blur-md sm:[&_[data-slot=sidebar-inner]]:rounded-[2rem]";

const pillRowClass =
  "flex h-10 w-full items-center gap-2 rounded-[1.15rem] border border-transparent px-3 text-muted-foreground transition-colors hover:bg-accent/55 hover:text-foreground sm:rounded-[1.25rem]";

const navActiveClass =
  "data-[active=true]:border-border data-[active=true]:bg-accent/70 data-[active=true]:font-medium data-[active=true]:text-foreground data-[active=true]:shadow-sm";

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations();
  const { team, teams } = useTeamAccess();

  const navItems = [
    {
      title: t("navigation.dashboard"),
      href: getTeamDashboardPath(team.slug),
      icon: IconHouse,
      isActive: pathname === getTeamDashboardPath(team.slug),
    },
    {
      title: t("team.title"),
      href: getTeamMembersPath(team.slug),
      icon: IconUsers,
      isActive: pathname.startsWith(getTeamMembersPath(team.slug)),
    },
    {
      title: t("libraries.title"),
      href: getTeamLibrariesPath(team.slug),
      icon: IconFolder,
      isActive: pathname.startsWith(getTeamLibrariesPath(team.slug)),
    },
  ];

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  return (
    <Sidebar
      className={cn("min-h-svh", sidebarFloatingInnerClass)}
      collapsible="offcanvas"
      variant="floating"
    >
      <SidebarHeader className="border-0 p-2 pb-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(pillRowClass, "justify-between")}
              type="button"
            >
              <span className="min-w-0 truncate">{team.name}</span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 rounded-2xl">
            {teams.map((workspace) => (
              <DropdownMenuItem
                key={workspace._id}
                className="rounded-xl"
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
                  {workspace._id === team._id && <Check className="h-4 w-4" />}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent className="min-h-0 flex-1 gap-0 overflow-x-visible overflow-y-auto p-2 pt-1">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    className={cn(pillRowClass, navActiveClass)}
                    isActive={item.isActive}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mt-auto shrink-0 border-0 p-2 pt-1">
        <SidebarMenu className="gap-1.5">
          <SidebarMenuItem>
            <InvitationInbox
              fullWidth
              fullWidthTriggerClassName={pillRowClass}
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <AccountSettings triggerClassName={pillRowClass} />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <LanguageSwitcher triggerClassName={pillRowClass} variant="row" />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <ModeToggle className={pillRowClass} variant="row" />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button
              className={cn(pillRowClass, "justify-start font-normal")}
              onClick={handleLogout}
              title={t("common.signOut")}
              type="button"
              variant="ghost"
            >
              <IconCirclePowerOff className="h-4 w-4 shrink-0" />
              <span className="truncate">{t("common.signOut")}</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
