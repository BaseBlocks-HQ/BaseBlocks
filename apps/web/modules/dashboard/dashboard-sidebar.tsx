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
    <Sidebar collapsible="offcanvas" className="min-h-svh">
      <SidebarHeader className="border-b h-14 px-4 flex items-center">
        <div className="flex items-center gap-2 w-full">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
              >
                <span className="block truncate text-sm font-semibold">
                  {team.name}
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {teams.map((workspace) => (
                <DropdownMenuItem
                  key={workspace._id}
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
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={item.isActive}>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <div className="flex flex-col gap-1 px-2 py-2">
          <InvitationInbox fullWidth />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <AccountSettings />
            </div>
            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <ModeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title={t("common.signOut")}
              >
                <IconCirclePowerOff className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
