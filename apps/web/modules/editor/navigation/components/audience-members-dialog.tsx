"use client";

import { DashboardDialogShell } from "@/core/dialogs";
import { useAudienceMemberAssignments, useMembers } from "@/lib/data";
import { useSite } from "@/lib/data/use-site";
import { api } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { Checkbox } from "@baseblocks/ui/checkbox";
import { DialogFooter } from "@baseblocks/ui/dialog";
import { Label } from "@baseblocks/ui/label";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import { useMutation } from "convex/react";
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

export function AudienceMembersDialog({
  audienceId,
  open,
  onOpenChange,
  siteId,
}: AudienceMembersDialogProps) {
  const t = useTranslations("navigation.audienceMembers");
  const tCommon = useTranslations("common");
  const site = useSite(siteId);
  const members = useMembers(site?._id ? site.teamId : undefined);
  const assignments = useAudienceMemberAssignments(audienceId);
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
  assignments: ReturnType<typeof useAudienceMemberAssignments>;
  audienceId?: string;
  members: ReturnType<typeof useMembers>;
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
    <DashboardDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={t("description")}
      contentClassName="sm:max-w-lg"
    >
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
    </DashboardDialogShell>
  );
}
