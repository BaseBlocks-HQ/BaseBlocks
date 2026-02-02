"use client";

import { AccountSettings } from "@/components/dashboard/account-settings";
import { InvitationInbox } from "@/components/dashboard/invitation-inbox";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/sidebar";
import { Link, usePathname } from "@/i18n/navigation";
import { useEntityAuth } from "@/lib/auth";
import { Folder, Home, LogOut, Users } from "lucide-react";
import { useTranslations } from "next-intl";

interface DashboardSidebarProps {
  companyName: string;
}

export function DashboardSidebar({ companyName }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { logout } = useEntityAuth();
  const t = useTranslations();

  const navItems = [
    {
      title: t("navigation.dashboard"),
      href: "/dashboard",
      icon: Home,
      isActive: pathname === "/dashboard",
    },
    {
      title: t("team.title"),
      href: "/dashboard/team",
      icon: Users,
      isActive: pathname.startsWith("/dashboard/team"),
    },
    {
      title: t("libraries.title"),
      href: "/dashboard/libraries",
      icon: Folder,
      isActive: pathname.startsWith("/dashboard/libraries"),
    },
  ];

  return (
    <Sidebar collapsible="none" className="min-h-svh">
      <SidebarHeader className="border-b">
        <Link href="/dashboard" className="flex items-center gap-2 px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
            B
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">BaseBlocks</span>
            <span className="text-xs text-muted-foreground truncate max-w-[140px]">
              {companyName}
            </span>
          </div>
        </Link>
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
          {/* First row: Inbox button full width */}
          <InvitationInbox fullWidth />

          {/* Second row: Settings, Language, Theme, Logout */}
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
                onClick={logout}
                title={t("common.signOut")}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
