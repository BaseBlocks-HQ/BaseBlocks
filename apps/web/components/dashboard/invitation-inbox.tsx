"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useEntityAuth } from "@/lib/auth";
import { api } from "@repo/backend";
import { useAction } from "convex/react";
import { Check, Inbox, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

interface ReceivedInvitation {
  id: string;
  orgId: string;
  role: "admin" | "viewer";
  eaRole: string; // Original EA role (admin/member)
  expiresAt: number;
  createdAt: number;
  inviterEmail: string | null;
  inviterUsername: string | null;
  inviterImageUrl: string | null;
}

interface InvitationInboxProps {
  fullWidth?: boolean;
}

export function InvitationInbox({ fullWidth = false }: InvitationInboxProps) {
  const t = useTranslations("inbox");
  const { getToken } = useEntityAuth();

  const [open, setOpen] = useState(false);
  const [invitations, setInvitations] = useState<ReceivedInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getInvitations = useAction(
    api.members.actions.getMyReceivedInvitations,
  );
  const acceptInvitation = useAction(
    api.members.actions.acceptReceivedInvitation,
  );
  const declineInvitation = useAction(
    api.members.actions.declineReceivedInvitation,
  );

  const loadInvitations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;

      const results = await getInvitations({ accessToken: token });
      setInvitations(results);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load invitations",
      );
    } finally {
      setIsLoading(false);
    }
  }, [getToken, getInvitations]);

  const handleAccept = async (invitation: ReceivedInvitation) => {
    setProcessingId(invitation.id);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      await acceptInvitation({
        invitationId: invitation.id,
        accessToken: token,
        orgId: invitation.orgId,
        role: invitation.role,
        eaRole: invitation.eaRole,
      });
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitation.id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to accept invitation",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitationId: string) => {
    setProcessingId(invitationId);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      await declineInvitation({ invitationId, accessToken: token });
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to decline invitation",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getInitials = (username?: string | null, email?: string | null) => {
    if (username) return username.slice(0, 2).toUpperCase();
    if (email) return email[0]?.toUpperCase() || "?";
    return "?";
  };

  // Load invitations on mount and poll every 30 seconds for badge
  useEffect(() => {
    loadInvitations();
    const interval = setInterval(loadInvitations, 30000);
    return () => clearInterval(interval);
  }, [loadInvitations]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {fullWidth ? (
          <Button variant="ghost" className="w-full justify-start gap-2 h-8 px-2 relative">
            <Inbox className="h-4 w-4" />
            <span>{t("title")}</span>
            {invitations.length > 0 && (
              <Badge
                variant="destructive"
                className="ml-auto h-5 min-w-5 px-1 flex items-center justify-center text-[10px] font-bold animate-pulse"
              >
                {invitations.length}
              </Badge>
            )}
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="relative">
            <Inbox className="h-4 w-4" />
            {invitations.length > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] font-bold animate-pulse"
              >
                {invitations.length}
              </Badge>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            {t("title")}
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
              {error}
            </p>
          )}

          {!isLoading && invitations.length === 0 && (
            <div className="text-center py-8">
              <Inbox className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                {t("noInvitations")}
              </p>
            </div>
          )}

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-start gap-3 p-4 rounded-lg border bg-card"
              >
                <Avatar className="h-10 w-10">
                  {invitation.inviterImageUrl && (
                    <AvatarImage src={invitation.inviterImageUrl} />
                  )}
                  <AvatarFallback>
                    {getInitials(
                      invitation.inviterUsername,
                      invitation.inviterEmail,
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <p className="font-medium">
                      {invitation.inviterUsername ||
                        invitation.inviterEmail ||
                        t("invitedToOrg")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("invitedYou")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">
                      {invitation.role}
                    </Badge>
                    <span>·</span>
                    <span>
                      {t("expires", { date: formatDate(invitation.expiresAt) })}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(invitation)}
                      disabled={processingId === invitation.id}
                    >
                      {processingId === invitation.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          {t("accept")}
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDecline(invitation.id)}
                      disabled={processingId === invitation.id}
                    >
                      <X className="h-4 w-4 mr-1" />
                      {t("decline")}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
