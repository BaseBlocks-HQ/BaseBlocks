"use client";

import { api } from "@baseblocks/backend";
import type { Doc, Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { Checkbox } from "@baseblocks/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@baseblocks/ui/dialog";
import { Label } from "@baseblocks/ui/label";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import { useMutation, useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

interface AudienceMembersDialogProps {
  audienceId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
}

type TranslationFn = ReturnType<typeof useTranslations>;
type AudienceAssignments = {
  audience: { _id: Id<"siteAudiences">; name: string };
  userIds: string[];
} | null;
type MemberListItem = Pick<
  Doc<"members">,
  "_id" | "email" | "imageUrl" | "joinedAt" | "name" | "role" | "userId"
>;

export function AudienceMembersDialog({
  audienceId,
  open,
  onOpenChange,
  siteId,
}: AudienceMembersDialogProps) {
  const t = useTranslations("navigation.audienceMembers");
  const tCommon = useTranslations("common");
  const site = useQuery(api.sites.queries.get, {
    siteId: siteId as Id<"sites">,
  });
  const members = useQuery(
    api.members.queries.list,
    site?._id ? { teamId: site.teamId } : "skip",
  );
  const assignments = useQuery(
    api.siteAudiences.queries.getMemberAssignments,
    audienceId
      ? { audienceId: audienceId as Id<"siteAudiences"> }
      : "skip",
  );
  const resetKey = [
    audienceId ?? "no-audience",
    open ? "open" : "closed",
    assignments?.userIds.join(",") ?? "loading",
  ].join(":");

  return (
    <AudienceMembersDialogContent
      key={resetKey}
      assignments={assignments}
      audienceId={audienceId}
      members={members}
      onOpenChange={onOpenChange}
      open={open}
      t={t}
      tCommon={tCommon}
    />
  );
}

function AudienceMembersDialogContent({
  assignments,
  audienceId,
  members,
  onOpenChange,
  open,
  t,
  tCommon,
}: {
  assignments: AudienceAssignments | undefined;
  audienceId?: string;
  members: MemberListItem[] | undefined;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  t: TranslationFn;
  tCommon: TranslationFn;
}) {
  const setMembers = useMutation(api.siteAudiences.mutations.setMembers);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    assignments?.userIds ?? [],
  );
  const [isSaving, setIsSaving] = useState(false);

  const toggleUserId = (userId: string) => {
    setSelectedUserIds((current) =>
      current.includes(userId)
        ? current.filter((existingUserId) => existingUserId !== userId)
        : [...current, userId],
    );
  };

  const handleSave = async () => {
    if (!audienceId) {
      return;
    }

    setIsSaving(true);
    const saveError = await setMembers({
      audienceId: audienceId as never,
      userIds: selectedUserIds,
    })
      .then(() => null)
      .catch((error) =>
        error instanceof Error ? error : new Error(t("toastError")),
      );
    setIsSaving(false);
    if (saveError) {
      toast.error(saveError.message);
      return;
    }

    toast.success(t("toastSuccess"));
    onOpenChange(false);
  };

  const audienceName = assignments?.audience.name?.trim();
  const title = audienceName
    ? t("title", { name: audienceName })
    : t("titleFallback");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[46rem] [&_[data-slot='dialog-close']]:top-4 [&_[data-slot='dialog-close']]:right-4 sm:max-w-lg`}
      >
        <DialogHeader className={"px-5 pt-4 pb-0"}>
          <DialogTitle className={"text-base font-semibold"}>
            {title}
          </DialogTitle>
          <DialogDescription className={"text-sm text-sidebar-foreground/60"}>
            {t("description")}
          </DialogDescription>
        </DialogHeader>
        <div className={"px-5 pb-3"}>
          <ScrollArea className="max-h-80">
            <div className="space-y-3 pr-3">
              {members === undefined || assignments === undefined ? (
                <div className="flex items-center justify-center py-6 text-sm text-sidebar-foreground/60">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("loading")}
                </div>
              ) : members.length === 0 ? (
                <p className="text-sm text-sidebar-foreground/60">
                  {t("emptyTeam")}
                </p>
              ) : (
                members.map((member) => (
                  <Label
                    key={member._id}
                    className="flex items-start gap-3 rounded-xl border border-sidebar-border/60 bg-background/40 p-3"
                  >
                    <Checkbox
                      checked={selectedUserIds.includes(member.userId)}
                      onCheckedChange={() => toggleUserId(member.userId)}
                    />
                    <div className="min-w-0">
                      <p className="font-medium">
                        {member.name?.trim() || member.email}
                      </p>
                      <p className="truncate text-sm text-sidebar-foreground/55">
                        {member.email}
                      </p>
                    </div>
                  </Label>
                ))
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-8 rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm"
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !audienceId}
              className="h-8 rounded-full px-4 text-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                t("saveMembers")
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
