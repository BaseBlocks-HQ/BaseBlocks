"use client";

import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/app/_auth/client";
import { getAuthClientDataOrThrow } from "@/app/_auth/result";
import { api } from "@baseblocks/backend";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@baseblocks/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@baseblocks/ui/avatar";
import { Badge } from "@baseblocks/ui/badge";
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@baseblocks/ui/dialog";
import { cn } from "@baseblocks/ui/lib/utils";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import { useMutation } from "convex/react";
import { Check, Inbox, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useReducer, useState } from "react";

const SIDEBAR_ICON_STROKE = 1.75;

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

  const syncMember = useMutation(api.teams.syncMemberFromInvitation);

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
      const invitations = getAuthClientDataOrThrow<AuthInvitation[]>(
        await authClient.organization.listUserInvitations(),
        t("loadFailed"),
      );
      const pending = invitations.filter((inv) => inv.status === "pending");
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
      getAuthClientDataOrThrow(
        await authClient.organization.acceptInvitation({
          invitationId: invitation.id,
        }),
        t("acceptFailed"),
      );
      await Promise.all([
        Promise.resolve(
          getAuthClientDataOrThrow(
            await authClient.organization.setActive({
              organizationId: invitation.organizationId,
            }),
            t("acceptFailed"),
          ),
        ),
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
      getAuthClientDataOrThrow(
        await authClient.organization.rejectInvitation({
          invitationId,
        }),
        t("declineFailed"),
      );
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
    if (!onboardingMode) {
      return;
    }

    void loadInvitations();
  }, [loadInvitations, onboardingMode]);

  useEffect(() => {
    if (!onboardingMode && !open) {
      return;
    }

    if (!onboardingMode) {
      void loadInvitations();
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
          <Inbox
            className="mx-auto mb-2 h-10 w-10 text-sidebar-foreground/35"
            strokeWidth={SIDEBAR_ICON_STROKE}
          />
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
      <Inbox
        className="h-5 w-5 shrink-0 text-muted-foreground"
        strokeWidth={SIDEBAR_ICON_STROKE}
      />
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
          <Inbox
            className="h-5 w-5 text-muted-foreground"
            strokeWidth={SIDEBAR_ICON_STROKE}
          />
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
        <DeclineInvitationDialog
          open={!!declineTarget}
          onOpenChange={(next) => !next && setDeclineTarget(null)}
          title={t("declineTitle")}
          description={t("declineDescription", {
            organization: declineDescriptionOrg,
          })}
          cancelLabel={tCommon("cancel")}
          confirmLabel={isDeclining ? t("declining") : t("declineConfirm")}
          confirmDisabled={isDeclining}
          onConfirm={confirmDecline}
        />
      </div>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {fullWidth ? (
            <Button
              type="button"
              variant="ghost"
              className={cn(
                "relative h-8 w-full justify-start gap-2 px-2",
                fullWidthTriggerClassName,
              )}
            >
              <Inbox
                className="h-4 w-4 text-muted-foreground"
                strokeWidth={SIDEBAR_ICON_STROKE}
              />
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
              <Inbox
                className="h-4 w-4 text-muted-foreground"
                strokeWidth={SIDEBAR_ICON_STROKE}
              />
              {invitations.length > 0 ? (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 flex h-5 w-5 animate-pulse items-center justify-center p-0 text-[10px] font-bold"
                >
                  {invitations.length}
                </Badge>
              ) : null}
            </Button>
          )}
        </DialogTrigger>
        <DialogContent
          className={`overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[46rem] [&_[data-slot='dialog-close']]:top-4 [&_[data-slot='dialog-close']]:right-4 sm:max-w-md`}
        >
          <DialogHeader className={"px-5 pt-4 pb-0"}>
            <DialogTitle className="text-base font-semibold">
              {headerTitle}
            </DialogTitle>
          </DialogHeader>
          <div className={`px-5 pb-3 pt-1 pb-4`}>{invitationContent}</div>
        </DialogContent>
      </Dialog>

      <DeclineInvitationDialog
        open={!!declineTarget}
        onOpenChange={(next) => !next && setDeclineTarget(null)}
        title={t("declineTitle")}
        description={t("declineDescription", {
          organization: declineDescriptionOrg,
        })}
        cancelLabel={tCommon("cancel")}
        confirmLabel={isDeclining ? t("declining") : t("declineConfirm")}
        confirmDisabled={isDeclining}
        onConfirm={confirmDecline}
      />
    </>
  );
}

function DeclineInvitationDialog({
  cancelLabel,
  confirmDisabled,
  confirmLabel,
  description,
  onConfirm,
  onOpenChange,
  open,
  title,
}: {
  cancelLabel: string;
  confirmDisabled: boolean;
  confirmLabel: string;
  description: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[32rem]">
        <AlertDialogHeader className="px-5 pt-5 pb-0 text-left sm:text-left">
          <AlertDialogTitle className="text-base font-semibold text-balance">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-sidebar-foreground/60">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="px-5 pt-3 pb-4 sm:justify-end">
          <AlertDialogCancel
            size="sm"
            className="rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            size="sm"
            disabled={confirmDisabled}
            className="rounded-full px-4 text-sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
