"use client";

import { DashboardDialogShell } from "@/components/dialogs";
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
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface AudienceMembersDialogProps {
  audienceId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
}

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
  const setMembers = useMutation(api.siteAudiences.mutations.setMembers);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedUserIds(assignments?.userIds ?? []);
  }, [assignments?.userIds, open]);

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
    try {
      await setMembers({
        audienceId: audienceId as never,
        userIds: selectedUserIds,
      });
      toast.success(t("toastSuccess"));
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("toastError"),
      );
    } finally {
      setIsSaving(false);
    }
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
            <p className="text-sm text-sidebar-foreground/60">{t("emptyTeam")}</p>
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
