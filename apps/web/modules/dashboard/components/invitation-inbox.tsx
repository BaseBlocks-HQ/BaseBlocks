"use client";

import {
  DashboardConfirmDialog,
  DashboardDialogShell,
} from "@/components/dialogs";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth/client";
import { api } from "@baseblocks/backend";
import { Avatar, AvatarFallback } from "@baseblocks/ui/avatar";
import { Badge } from "@baseblocks/ui/badge";
import { Button } from "@baseblocks/ui/button";
import { cn } from "@baseblocks/ui/lib/utils";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import { useMutation } from "convex/react";
import { Check, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { IconInbox } from "nucleo-glass";
import { useCallback, useEffect, useReducer, useState } from "react";

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
        invitations: state.invitations.filter((inv) => inv.id !== action.id),
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

function organizationLabel(
  invitation: ReceivedInvitation,
  invitedToOrg: string,
) {
  return invitation.organizationName || invitation.inviterEmail || invitedToOrg;
}

interface InvitationInboxProps {
  fullWidth?: boolean;
  fullWidthTriggerClassName?: string;
  onboardingMode?: boolean;
}

export function InvitationInbox({
  fullWidth = false,
  fullWidthTriggerClassName,
  onboardingMode = false,
}: InvitationInboxProps) {
  const t = useTranslations("inbox");
  const tTeam = useTranslations("team");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [declineTarget, setDeclineTarget] = useState<ReceivedInvitation | null>(
    null,
  );
  const [isDeclining, setIsDeclining] = useState(false);
  const [state, dispatch] = useReducer(inboxReducer, initialState);
  const { invitations, isLoading, processingId, error } = state;

  const syncMember = useMutation(
    api.members.mutations.syncMemberFromInvitation,
  );

  const roleLabel = (role: string) => {
    if (role === "admin") return tTeam("roles.admin");
    if (role === "owner") return tTeam("roles.owner");
    if (role === "member" || role === "editor") return tTeam("roles.editor");
    if (role === "viewer") return tTeam("roles.viewer");
    return role;
  };

  const loadInvitations = useCallback(async () => {
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
        error: err instanceof Error ? err.message : t("loadFailed"),
      });
    }
  }, [t]);

  const handleAccept = async (invitation: ReceivedInvitation) => {
    dispatch({ type: "PROCESS_START", id: invitation.id });
    try {
      await authClient.organization.acceptInvitation({
        invitationId: invitation.id,
      });
      await Promise.all([
        authClient.organization.setActive({
          organizationId: invitation.organizationId,
        }),
        syncMember({
          organizationId: invitation.organizationId,
        }),
      ]);
      dispatch({ type: "REMOVE_INVITATION", id: invitation.id });
      if (onboardingMode) {
        router.push("/dashboard");
      }
    } catch (err) {
      dispatch({
        type: "PROCESS_ERROR",
        error: err instanceof Error ? err.message : t("acceptFailed"),
      });
      loadInvitations();
    }
  };

  const runDecline = async (invitationId: string) => {
    dispatch({ type: "PROCESS_START", id: invitationId });
    try {
      await authClient.organization.rejectInvitation({
        invitationId,
      });
      dispatch({ type: "REMOVE_INVITATION", id: invitationId });
    } catch (err) {
      dispatch({
        type: "PROCESS_ERROR",
        error: err instanceof Error ? err.message : t("declineFailed"),
      });
      throw err;
    }
  };

  const confirmDecline = () => {
    if (!declineTarget) return;
    setIsDeclining(true);
    void runDecline(declineTarget.id)
      .then(() => setDeclineTarget(null))
      .catch(() => {})
      .finally(() => setIsDeclining(false));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  const getInitials = (email?: string | null) => {
    if (email) return email[0]?.toUpperCase() || "?";
    return "?";
  };

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  useEffect(() => {
    if (!onboardingMode && !open) {
      return;
    }

    const interval = setInterval(() => {
      void loadInvitations();
    }, 30000);

    return () => clearInterval(interval);
  }, [onboardingMode, open, loadInvitations]);

  const invitationContent = (
    <div className="space-y-3">
      {error ? (
        <p
          className={cn(
            "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive",
          )}
        >
          {error}
        </p>
      ) : null}

      {!isLoading && invitations.length === 0 ? (
        <div className="py-6 text-center">
          <IconInbox className="mx-auto mb-2 h-10 w-10 text-sidebar-foreground/35" />
          <p className="text-sm text-sidebar-foreground/55">
            {t("noInvitations")}
          </p>
        </div>
      ) : null}

      <ScrollArea className="max-h-80">
        <div className="space-y-3 pr-3">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex items-start gap-3 rounded-[1.1rem] border border-sidebar-border/80 bg-background/55 p-4 shadow-[inset_0_1px_0_hsl(var(--background)/0.4)]"
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
                  {getInitials(invitation.inviterEmail)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="font-medium text-sidebar-foreground">
                    {organizationLabel(invitation, t("invitedToOrg"))}
                  </p>
                  <p className="text-sm text-sidebar-foreground/55">
                    {t("invitedYou")}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-sidebar-foreground/55">
                  <Badge
                    variant="secondary"
                    className="border-sidebar-border/60 bg-sidebar-accent/40 text-xs text-sidebar-foreground"
                  >
                    {roleLabel(invitation.role)}
                  </Badge>
                  <span aria-hidden>·</span>
                  <span>
                    {t("expires", { date: formatDate(invitation.expiresAt) })}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    className="h-8 gap-2 rounded-full px-3.5 text-sm"
                    onClick={() => handleAccept(invitation)}
                    disabled={processingId === invitation.id}
                  >
                    {processingId === invitation.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 shrink-0" />
                        {t("accept")}
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-2 rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    onClick={() => setDeclineTarget(invitation)}
                    disabled={processingId === invitation.id}
                  >
                    <X className="h-4 w-4 shrink-0" />
                    {t("decline")}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  const declineDescriptionOrg = declineTarget
    ? organizationLabel(declineTarget, t("invitedToOrg"))
    : "";

  const headerTitle = (
    <span className="flex items-center gap-2">
      <IconInbox className="h-5 w-5 shrink-0" />
      <span>{t("title")}</span>
      {isLoading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-sidebar-foreground/50" />
      ) : null}
    </span>
  );

  if (onboardingMode) {
    return (
      <div>
        <div className="mb-3 flex items-center gap-2">
          <IconInbox className="h-5 w-5" />
          <h3 className="font-medium">{t("title")}</h3>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : null}
          {invitations.length > 0 ? (
            <Badge
              variant="destructive"
              className="flex h-5 min-w-5 animate-pulse items-center justify-center px-1 text-[10px] font-bold"
            >
              {invitations.length}
            </Badge>
          ) : null}
        </div>
        {invitationContent}
        <DashboardConfirmDialog
          open={!!declineTarget}
          onOpenChange={(next) => !next && setDeclineTarget(null)}
          title={t("declineTitle")}
          description={t("declineDescription", {
            organization: declineDescriptionOrg,
          })}
          cancelLabel={tCommon("cancel")}
          confirmLabel={isDeclining ? t("declining") : t("declineConfirm")}
          confirmDisabled={isDeclining}
          variant="default"
          onConfirm={confirmDecline}
        />
      </div>
    );
  }

  return (
    <>
      <DashboardDialogShell
        open={open}
        onOpenChange={setOpen}
        title={headerTitle}
        contentClassName="sm:max-w-md"
        bodyClassName="px-5 pb-4 pt-1"
        trigger={
          fullWidth ? (
            <Button
              type="button"
              variant="ghost"
              className={cn(
                "relative h-8 w-full justify-start gap-2 px-2",
                fullWidthTriggerClassName,
              )}
            >
              <IconInbox className="h-4 w-4" />
              <span>{t("title")}</span>
              {invitations.length > 0 ? (
                <Badge
                  variant="destructive"
                  className="ml-auto flex h-5 min-w-5 items-center justify-center px-1 text-[10px] font-bold"
                >
                  {invitations.length}
                </Badge>
              ) : null}
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative"
            >
              <IconInbox className="h-4 w-4" />
              {invitations.length > 0 ? (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 flex h-5 w-5 animate-pulse items-center justify-center p-0 text-[10px] font-bold"
                >
                  {invitations.length}
                </Badge>
              ) : null}
            </Button>
          )
        }
      >
        {invitationContent}
      </DashboardDialogShell>

      <DashboardConfirmDialog
        open={!!declineTarget}
        onOpenChange={(next) => !next && setDeclineTarget(null)}
        title={t("declineTitle")}
        description={t("declineDescription", {
          organization: declineDescriptionOrg,
        })}
        cancelLabel={tCommon("cancel")}
        confirmLabel={isDeclining ? t("declining") : t("declineConfirm")}
        confirmDisabled={isDeclining}
        variant="default"
        onConfirm={confirmDecline}
      />
    </>
  );
}
