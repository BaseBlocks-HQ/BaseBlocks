"use client";

import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/avatar";
import { Badge } from "@repo/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/table";
import { useQuery } from "convex/react";
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
  role: "admin" | "viewer";
  joinedAt: number;
}

export function TeamContent() {
  const t = useTranslations("team");

  const team = useQuery(api.teams.queries.getMine);
  const members = useQuery(
    api.members.queries.list,
    team ? { teamId: team._id } : "skip",
  );
  const myRole = useQuery(
    api.members.queries.getMyRole,
    team ? { teamId: team._id } : "skip",
  );

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
    return "outline";
  };

  const isAdmin = myRole?.role === "admin";

  if (!team) {
    return null;
  }

  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && <InviteMemberDialog teamId={team._id} />}
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
                {isAdmin && members.length > 1 && (
                  <TableHead className="w-[70px]"></TableHead>
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
                        : t("roles.viewer")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(member.joinedAt)}
                  </TableCell>
                  {isAdmin && members.length > 1 && (
                    <TableCell>
                      <MemberActions
                        member={member}
                        teamId={team._id}
                        isCurrentUserAdmin={isAdmin}
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
          {isAdmin && <InviteMemberDialog teamId={team._id} />}
        </div>
      )}
    </main>
  );
}
