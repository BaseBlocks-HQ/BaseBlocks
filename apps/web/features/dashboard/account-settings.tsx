"use client";

import { useTeamAccess } from "@/features/authentication/team-access";
import type { WorkspaceUser } from "@/features/authentication/model";
import { AccountSection } from "@/features/dashboard/settings/account-section";
import { OrganizationsSection } from "@/features/dashboard/settings/organizations-section";
import { hasOrganizationRole } from "@baseblocks/backend/organization-policy";
import { CogIcon, CorporateIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@baseblocks/ui/dialog";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@baseblocks/ui/sidebar";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";

export type SettingsSection = "account" | "organizations";

export function AccountSettings({
  asChild = false,
  children,
  initialSection = "account",
  open: openProp,
  onOpenChange,
  showTrigger = true,
  triggerClassName,
  user: userProp,
}: {
  asChild?: boolean;
  children?: ReactNode;
  initialSection?: SettingsSection;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  triggerClassName?: string;
  user?: WorkspaceUser | null;
} = {}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const { team, teams, user: contextUser } = useTeamAccess();
  const [internalOpen, setInternalOpen] = useState(false);
  const [section, setSection] = useState<SettingsSection>(initialSection);
  const open = openProp ?? internalOpen;
  const user = userProp ?? contextUser;

  useEffect(() => {
    if (open) setSection(initialSection);
  }, [initialSection, open]);

  const setOpen = (nextOpen: boolean) => {
    if (openProp === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const trigger =
    showTrigger &&
    (asChild && children ? (
      children
    ) : (
      <Button
        className={cn("h-8 w-full justify-start gap-2 px-2", triggerClassName)}
        type="button"
        variant="ghost"
      >
        <HugeiconsIcon icon={CogIcon} className="size-4" />
        <span>{tCommon("settings")}</span>
      </Button>
    ));

  const navigation = [
    { id: "account" as const, icon: CogIcon, label: t("accountNav") },
    {
      id: "organizations" as const,
      icon: CorporateIcon,
      label: t("organizationsNav"),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="h-[min(88vh,42rem)] w-[calc(100%-2rem)] max-w-[56rem] overflow-hidden rounded-[1.5rem] border-sidebar-border bg-background p-0 text-foreground shadow-2xl sm:max-w-[56rem] [&_[data-slot='dialog-close']]:right-4 [&_[data-slot='dialog-close']]:top-4">
        <DialogDescription className="sr-only">
          {t("description")}
        </DialogDescription>
        <SidebarProvider
          className="h-full min-h-0 items-stretch"
          cookieName={null}
        >
          <Sidebar
            className="w-40 border-e border-sidebar-border sm:w-52"
            collapsible="none"
          >
            <SidebarHeader className="h-16 shrink-0 justify-center px-4">
              <DialogTitle className="text-sm font-semibold">
                {t("title")}
              </DialogTitle>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup className="p-2">
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navigation.map((item) => (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          isActive={section === item.id}
                          onClick={() => setSection(item.id)}
                        >
                          <HugeiconsIcon icon={item.icon} />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
            {section === "account" ? (
              <AccountSection
                ownedOrganizationCount={
                  teams.filter((candidate) =>
                    hasOrganizationRole(candidate.memberRole, "owner"),
                  ).length
                }
                user={user}
              />
            ) : (
              <OrganizationsSection
                currentOrganizationId={team._id}
                teams={teams}
                user={user}
              />
            )}
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
}
