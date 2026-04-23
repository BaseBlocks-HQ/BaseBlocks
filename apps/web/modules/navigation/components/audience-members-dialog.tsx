"use client";

import { useAudienceMemberAssignments, useMembers } from "@/lib/data";
import { useSite } from "@/lib/data/use-site";
import { api } from "@baseblocks/backend";
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
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
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
      toast.success("Audience members updated");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update audience members",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Manage {assignments?.audience.name ?? "audience"} members
          </DialogTitle>
          <DialogDescription>
            Restricted pages stay hidden unless a signed-in team member belongs
            to one of the allowed audiences.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-80">
          <div className="space-y-3 pr-3">
            {members === undefined || assignments === undefined ? (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading members...
              </div>
            ) : members.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Invite team members before assigning this audience.
              </p>
            ) : (
              members.map((member) => (
                <Label
                  key={member._id}
                  className="flex items-start gap-3 rounded-md border p-3"
                >
                  <Checkbox
                    checked={selectedUserIds.includes(member.userId)}
                    onCheckedChange={() => toggleUserId(member.userId)}
                  />
                  <div className="min-w-0">
                    <p className="font-medium">
                      {member.name?.trim() || member.email}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {member.email}
                    </p>
                  </div>
                </Label>
              ))
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !audienceId}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save members"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
