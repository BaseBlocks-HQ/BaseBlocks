"use client";

import { useTeamAccess } from "@/features/authentication/team-access";
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
import { Users } from "lucide-react";
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
    if (role === "admin") return "secondary";
    if (role === "editor") return "default";
    return "outline";
  };

  if (!team) {
    return null;
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-5 sm:px-6">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[64rem]">
          <div className="mb-8 flex items-end justify-between gap-4 border-b border-foreground/10 pb-5">
            <div className="min-w-0">
              <h1 className="brand-display text-4xl leading-none font-normal tracking-[-0.03em] text-balance">
                {t("title")}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {capabilities.canManageTeam && (
                <InviteMemberDialog organizationId={team._id} />
              )}
            </div>
          </div>

          {members && members.length > 0 ? (
            <div className="overflow-hidden rounded-xl border bg-card">
              <Table>
                <TableHeader className="bg-muted/45 text-muted-foreground">
                  <TableRow>
                    <TableHead>{t("member.email")}</TableHead>
                    <TableHead>{t("member.role")}</TableHead>
                    <TableHead>{t("member.joined")}</TableHead>
                    {capabilities.canManageTeam && members.length > 1 && (
                      <TableHead className="w-[70px]" />
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member: MemberListItem) => (
                    <TableRow key={member._id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.imageUrl} />
                            <AvatarFallback>
                              {getInitials(member.name, member.email)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{member.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {member.role === "admin"
                            ? t("roles.admin")
                            : member.role === "editor"
                              ? t("roles.editor")
                              : t("roles.viewer")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(member.joinedAt)}
                      </TableCell>
                      {capabilities.canManageTeam && members.length > 1 && (
                        <TableCell>
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
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/10 py-12 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">{t("noMembers")}</h3>
              <p className="mt-1 mb-4 text-muted-foreground">
                {t("noMembersDescription")}
              </p>
              {capabilities.canManageTeam && (
                <InviteMemberDialog organizationId={team._id} />
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
