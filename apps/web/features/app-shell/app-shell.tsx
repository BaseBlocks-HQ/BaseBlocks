"use client";

import { useTeamAccess } from "@/features/authentication/team-access";
import { EditorProvider } from "@/features/editor/editor-state";
import { SidebarInset, SidebarProvider } from "@baseblocks/ui/sidebar";
import { useParams } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { AppHeaderProvider } from "./app-header";
import { AppSidebar } from "./app-sidebar";

export function AppShell({
  analyticsEnabled,
  children,
  defaultSidebarOpen,
}: {
  analyticsEnabled: boolean;
  children: ReactNode;
  defaultSidebarOpen: boolean;
}) {
  const { capabilities, team } = useTeamAccess();
  const params = useParams<{ siteId?: string }>();
  const siteId = typeof params.siteId === "string" ? params.siteId : null;

  return (
    <SidebarProvider
      className="brand-interface"
      cookieName="app_sidebar_state"
      defaultOpen={defaultSidebarOpen}
      style={{ "--sidebar-width": "15rem" } as CSSProperties}
    >
      <EditorProvider
        organizationId={team._id}
        permissions={{
          canEdit: capabilities.canEditContent,
          isAdmin: capabilities.canManageTeam,
          isLoading: false,
        }}
        siteId={siteId ?? ""}
      >
        <AppSidebar analyticsEnabled={analyticsEnabled} siteId={siteId} />
        <SidebarInset className="h-svh min-w-0 overflow-hidden">
          <AppHeaderProvider>{children}</AppHeaderProvider>
        </SidebarInset>
      </EditorProvider>
    </SidebarProvider>
  );
}
