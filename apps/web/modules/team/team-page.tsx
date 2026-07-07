"use client";

import { useMembers } from "@/lib/data/use-team";
import { useTeamAccess } from "@/modules/workspace/team-access";
import type { Id } from "@baseblocks/backend";
import type { TeamRole } from "@baseblocks/domain";
import { Avatar, AvatarFallback, AvatarImage } from "@baseblocks/ui/avatar";
import { Badge } from "@baseblocks/ui/badge";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
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
import { InviteMemberDialog } from "./invite-member-dialog";
import { MemberActions } from "./member-actions";

interface MemberListItem {
  _id: Id<"members">;
  userId?: string;
  email: string;
  name?: string;
  imageUrl?: string;
  role: TeamRole;
  joinedAt: number;
}

export function TeamPage() {
  const t = useTranslations("team");

  const { capabilities, team } = useTeamAccess();
  const members = useMembers(team?._id);

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
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-6 sm:px-6">
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto w-full max-w-[64rem] space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                {t("title")}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {capabilities.canManageTeam && (
                <InviteMemberDialog organizationId={team.organizationId} />
              )}
            </div>
          </div>

          {members && members.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
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
                            teamId={team._id}
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
            <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-muted/10">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">{t("noMembers")}</h3>
              <p className="text-muted-foreground mt-1 mb-4">
                {t("noMembersDescription")}
              </p>
              {capabilities.canManageTeam && (
                <InviteMemberDialog organizationId={team.organizationId} />
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </main>
  );
}
