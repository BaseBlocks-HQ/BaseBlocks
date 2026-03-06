"use client";

import { authClient } from "@/lib/auth/client";
import { api } from "@baseblocks/backend";
import { Avatar, AvatarFallback } from "@baseblocks/ui/avatar";
import { Badge } from "@baseblocks/ui/badge";
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@baseblocks/ui/dialog";
import { useMutation } from "convex/react";
import { Check, Inbox, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

interface ReceivedInvitation {
  id: string;
  organizationId: string;
  organizationName?: string;
  role: string;
  expiresAt: Date;
  inviterEmail?: string;
}

interface AuthInvitation {
  id: string;
  organizationId: string;
  organizationName?: string;
  role?: string;
  expiresAt: string | number | Date;
  inviterEmail?: string;
  status: string;
}

interface InvitationInboxProps {
  fullWidth?: boolean;
  /** When true, renders invitations inline (no dialog) for the onboarding page */
  onboardingMode?: boolean;
}

export function InvitationInbox({
  fullWidth = false,
  onboardingMode = false,
}: InvitationInboxProps) {
  const t = useTranslations("inbox");

  const [open, setOpen] = useState(false);
  const [invitations, setInvitations] = useState<ReceivedInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const syncMember = useMutation(
    api.members.mutations.syncMemberFromInvitation,
  );

  const loadInvitations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authClient.organization.listUserInvitations();
      if (result.data) {
        const pending = (result.data as AuthInvitation[]).filter(
          (inv) => inv.status === "pending",
        );
        setInvitations(
          pending.map((inv) => ({
            id: inv.id,
            organizationId: inv.organizationId,
            organizationName: inv.organizationName,
            role: inv.role || "member",
            expiresAt: new Date(inv.expiresAt),
            inviterEmail: inv.inviterEmail,
          })),
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load invitations",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (invitation: ReceivedInvitation) => {
    setProcessingId(invitation.id);
    try {
      // Accept in Better Auth (creates BA member record, updates invitation status)
      await authClient.organization.acceptInvitation({
        invitationId: invitation.id,
      });

      // Remove from UI immediately — the invitation is consumed in BA and
      // cannot be re-accepted, so keeping it visible would be misleading
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitation.id));

      // Set the accepted organization as active in the BA session so
      // subsequent API calls (e.g. inviteMember) target the correct org
      await authClient.organization.setActive({
        organizationId: invitation.organizationId,
      });

      // Sync to Convex members table (creates the Convex member record
      // which links the user to the team and grants role-based access).
      // Role is read from the verified BA member record, not from client.
      await syncMember({
        organizationId: invitation.organizationId,
      });
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
      await authClient.organization.rejectInvitation({
        invitationId,
      });
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to decline invitation",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  const getInitials = (email?: string | null) => {
    if (email) return email[0]?.toUpperCase() || "?";
    return "?";
  };

  // Load invitations on mount and poll every 30 seconds
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only + interval
  useEffect(() => {
    loadInvitations();
    const interval = setInterval(loadInvitations, 30000);
    return () => clearInterval(interval);
  }, []);

  // Shared invitation list content
  const invitationContent = (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
          {error}
        </p>
      )}

      {!isLoading && invitations.length === 0 && (
        <div className="text-center py-6">
          <Inbox className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">{t("noInvitations")}</p>
        </div>
      )}

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex items-start gap-3 p-4 rounded-lg border bg-card"
          >
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {getInitials(invitation.inviterEmail)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <p className="font-medium">
                  {invitation.organizationName ||
                    invitation.inviterEmail ||
                    t("invitedToOrg")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("invitedYou")}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  {invitation.role === "member" ? "viewer" : invitation.role}
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
  );

  // In onboarding mode, render inline (no dialog wrapper)
  if (onboardingMode) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Inbox className="h-5 w-5" />
          <h3 className="font-medium">{t("title")}</h3>
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {invitations.length > 0 && (
            <Badge
              variant="destructive"
              className="h-5 min-w-5 px-1 flex items-center justify-center text-[10px] font-bold animate-pulse"
            >
              {invitations.length}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-3">{t("description")}</p>
        {invitationContent}
      </div>
    );
  }

  // Default: render as dialog
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {fullWidth ? (
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 h-8 px-2 relative"
          >
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

        {invitationContent}
      </DialogContent>
    </Dialog>
  );
}
