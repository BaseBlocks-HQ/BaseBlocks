"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEntityAuth } from "@/lib/auth";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { useAction, useQuery } from "convex/react";
import { RefreshCw, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { InviteMemberDialog } from "./invite-member-dialog";
import { MemberActions } from "./member-actions";

interface MemberListItem {
  _id: Id<"members">;
  eaUserId: string;
  email: string;
  name?: string;
  imageUrl?: string;
  role: "admin" | "viewer";
  eaRole: string;
  joinedAt: number;
  isOwner: boolean;
}

export function TeamContent() {
  const t = useTranslations("team");
  const { getToken } = useEntityAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const company = useQuery(api.companies.queries.getMine);
  const members = useQuery(
    api.members.queries.list,
    company ? { companyId: company._id } : "skip"
  );
  const myRole = useQuery(
    api.members.queries.getMyRole,
    company ? { companyId: company._id } : "skip"
  );

  const syncMembers = useAction(api.members.actions.syncMembers);

  // Auto-sync members on mount if empty
  useEffect(() => {
    if (company && members && members.length === 0) {
      handleSync();
    }
  }, [company?._id, members?.length]);

  const handleSync = async () => {
    if (!company || isSyncing) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      await syncMembers({
        companyId: company._id,
        accessToken: token,
      });
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

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

  const getRoleBadgeVariant = (role: string, isOwner: boolean) => {
    if (isOwner) return "default";
    if (role === "admin") return "secondary";
    return "outline";
  };

  const isAdmin = myRole?.role === "admin";

  if (!company) {
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing ? t("syncing") : t("syncMembers")}
          </Button>
          {isAdmin && <InviteMemberDialog companyId={company._id} />}
        </div>
      </div>

      {syncError && (
        <div className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-md">
          {syncError}
        </div>
      )}

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
                    <Badge variant={getRoleBadgeVariant(member.role, member.isOwner)}>
                      {member.isOwner
                        ? t("roles.owner")
                        : member.role === "admin"
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
                        companyId={company._id}
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
          {isAdmin && <InviteMemberDialog companyId={company._id} />}
        </div>
      )}
    </main>
  );
}
