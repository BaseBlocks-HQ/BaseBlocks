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
import { useEffect, useReducer, useState } from "react";

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

type InboxState = {
  invitations: ReceivedInvitation[];
  isLoading: boolean;
  processingId: string | null;
  error: string | null;
};

type InboxAction =
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; invitations: ReceivedInvitation[] }
  | { type: "LOAD_ERROR"; error: string }
  | { type: "PROCESS_START"; id: string }
  | { type: "PROCESS_DONE" }
  | { type: "REMOVE_INVITATION"; id: string }
  | { type: "PROCESS_ERROR"; error: string };

function inboxReducer(state: InboxState, action: InboxAction): InboxState {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, isLoading: true, error: null };
    case "LOAD_SUCCESS":
      return { ...state, isLoading: false, invitations: action.invitations };
    case "LOAD_ERROR":
      return { ...state, isLoading: false, error: action.error };
    case "PROCESS_START":
      return { ...state, processingId: action.id };
    case "PROCESS_DONE":
      return { ...state, processingId: null };
    case "REMOVE_INVITATION":
      return {
        ...state,
        processingId: null,
        invitations: state.invitations.filter(
          (inv) => inv.id !== action.id,
        ),
      };
    case "PROCESS_ERROR":
      return { ...state, processingId: null, error: action.error };
  }
}

const initialState: InboxState = {
  invitations: [],
  isLoading: false,
  processingId: null,
  error: null,
};

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
  const [state, dispatch] = useReducer(inboxReducer, initialState);
  const { invitations, isLoading, processingId, error } = state;

  const syncMember = useMutation(
    api.members.mutations.syncMemberFromInvitation,
  );

  const loadInvitations = async () => {
    dispatch({ type: "LOAD_START" });
    try {
      const result = await authClient.organization.listUserInvitations();
      if (result.data) {
        const pending = (result.data as AuthInvitation[]).filter(
          (inv) => inv.status === "pending",
        );
        dispatch({
          type: "LOAD_SUCCESS",
          invitations: pending.map((inv) => ({
            id: inv.id,
            organizationId: inv.organizationId,
            organizationName: inv.organizationName,
            role: inv.role || "member",
            expiresAt: new Date(inv.expiresAt),
            inviterEmail: inv.inviterEmail,
          })),
        });
      } else {
        dispatch({ type: "LOAD_SUCCESS", invitations: [] });
      }
    } catch (err) {
      dispatch({
        type: "LOAD_ERROR",
        error: err instanceof Error ? err.message : "Failed to load invitations",
      });
    }
  };

  const handleAccept = async (invitation: ReceivedInvitation) => {
    dispatch({ type: "PROCESS_START", id: invitation.id });
    try {
      await authClient.organization.acceptInvitation({
        invitationId: invitation.id,
      });
      // setActive and syncMember are independent — run in parallel
      await Promise.all([
        authClient.organization.setActive({
          organizationId: invitation.organizationId,
        }),
        syncMember({
          organizationId: invitation.organizationId,
        }),
      ]);
      dispatch({ type: "REMOVE_INVITATION", id: invitation.id });
    } catch (err) {
      dispatch({
        type: "PROCESS_ERROR",
        error: err instanceof Error ? err.message : "Failed to accept invitation",
      });
      loadInvitations();
    }
  };

  const handleDecline = async (invitationId: string) => {
    dispatch({ type: "PROCESS_START", id: invitationId });
    try {
      await authClient.organization.rejectInvitation({
        invitationId,
      });
      dispatch({ type: "REMOVE_INVITATION", id: invitationId });
    } catch (err) {
      dispatch({
        type: "PROCESS_ERROR",
        error: err instanceof Error ? err.message : "Failed to decline invitation",
      });
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
