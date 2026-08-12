"use client";

import { useTeamAccess } from "@/features/authentication/team-access";
import {
  DashboardPage,
  DashboardPageEmptyState,
  DashboardPageHeader,
  DashboardPageLoadingState,
} from "@/features/dashboard/layout/dashboard-page";
import { api } from "@baseblocks/backend";
import type { OrganizationRole } from "@baseblocks/backend/auth-permissions";
import { Avatar, AvatarFallback, AvatarImage } from "@baseblocks/ui/avatar";
import { Badge } from "@baseblocks/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@baseblocks/ui/table";
import { useTranslations } from "next-intl";
import { useQuery } from "convex/react";
import { InviteMemberDialog } from "./invite-member-dialog";
import { MemberActions } from "./member-actions";

interface MemberListItem {
  _id: string;
  userId?: string;
  email: string;
  name?: string;
  imageUrl?: string;
  role: OrganizationRole;
  joinedAt: number;
}

export function TeamPage() {
  const t = useTranslations("team");

  const { capabilities, team } = useTeamAccess();
  const members = useQuery(api.organizations.listMembers, {
    organizationId: team._id,
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0]?.toUpperCase() || "?";
    }
    return "?";
  };

  const getRoleBadgeVariant = (role: string) => {
    if (role === "owner") return "secondary";
    if (role === "admin") return "secondary";
    if (role === "editor") return "default";
    return "outline";
  };

  if (!team) {
    return null;
  }

  return (
    <DashboardPage>
      <DashboardPageHeader
        action={
          capabilities.canManageTeam ? (
            <InviteMemberDialog organizationId={team._id} />
          ) : null
        }
        title={t("title")}
      />

      {members === undefined ? (
        <DashboardPageLoadingState />
      ) : members.length > 0 ? (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/[0.06]">
          <Table className="[&_td:first-child]:pl-4 [&_td:last-child]:pr-3 [&_th:first-child]:pl-4 [&_th:last-child]:pr-3">
            <TableHeader className="text-xs text-muted-foreground [&_tr]:border-foreground/[0.07]">
              <TableRow>
                <TableHead className="h-9 font-normal">
                  {t("member.email")}
                </TableHead>
                <TableHead className="h-9 font-normal">
                  {t("member.role")}
                </TableHead>
                <TableHead className="h-9 font-normal">
                  {t("member.joined")}
                </TableHead>
                {capabilities.canManageTeam && members.length > 1 && (
                  <TableHead className="h-9 w-12" />
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member: MemberListItem) => (
                <TableRow
                  className="border-foreground/[0.06] hover:bg-muted/30"
                  key={member._id}
                >
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-7">
                        <AvatarImage src={member.imageUrl} />
                        <AvatarFallback>
                          {getInitials(member.name, member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{member.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {member.role === "owner"
                        ? t("roles.owner")
                        : member.role === "admin"
                          ? t("roles.admin")
                          : member.role === "editor"
                            ? t("roles.editor")
                            : t("roles.viewer")}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 text-muted-foreground">
                    {formatDate(member.joinedAt)}
                  </TableCell>
                  {capabilities.canManageTeam && members.length > 1 && (
                    <TableCell className="py-2 text-right">
                      <MemberActions
                        member={member}
                        organizationId={team._id}
                        isCurrentUserAdmin={capabilities.canManageTeam}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <DashboardPageEmptyState message={t("noMembers")} />
      )}
    </DashboardPage>
  );
}
