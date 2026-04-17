"use client";

import { ConfirmDialog } from "@/components/dialogs";
import { useSiteAudiences } from "@/lib/data";
import { api } from "@baseblocks/backend";
import { normalizePageAccessPolicy } from "@baseblocks/types";
import type { PageListItem } from "@baseblocks/types";
import { Badge } from "@baseblocks/ui/badge";
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
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { RadioGroup, RadioGroupItem } from "@baseblocks/ui/radio-group";
import { type ReactMutation, useMutation } from "convex/react";
import { Loader2, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AudienceMembersDialog } from "./audience-members-dialog";

interface PageAccessDialogProps {
  isAdmin: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: PageListItem;
  siteId: string;
}

export function PageAccessDialog({
  isAdmin,
  open,
  onOpenChange,
  page,
  siteId,
}: PageAccessDialogProps) {
  const audiences = useSiteAudiences(siteId);
  const updateAccessPolicy = useMutation(
    api.pages.mutations.updateAccessPolicy,
  );
  const createAudience = useMutation(api.siteAudiences.mutations.create);
  const deleteAudience = useMutation(
    api.siteAudiences.mutations.deleteAudience,
  );

  const currentPolicy = useMemo(
    () => normalizePageAccessPolicy(page.accessPolicy),
    [page.accessPolicy],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <PageAccessDialogContent
          key={`${page._id}:${JSON.stringify(currentPolicy)}`}
          audiences={audiences}
          createAudience={createAudience}
          currentPolicy={currentPolicy}
          deleteAudience={deleteAudience}
          isAdmin={isAdmin}
          onOpenChange={onOpenChange}
          page={page}
          siteId={siteId}
          updateAccessPolicy={updateAccessPolicy}
        />
      ) : null}
    </Dialog>
  );
}

interface PageAccessDialogContentProps {
  audiences: ReturnType<typeof useSiteAudiences> | undefined;
  createAudience: ReactMutation<typeof api.siteAudiences.mutations.create>;
  currentPolicy: ReturnType<typeof normalizePageAccessPolicy>;
  deleteAudience: ReactMutation<
    typeof api.siteAudiences.mutations.deleteAudience
  >;
  isAdmin: boolean;
  onOpenChange: (open: boolean) => void;
  page: PageListItem;
  siteId: string;
  updateAccessPolicy: ReactMutation<
    typeof api.pages.mutations.updateAccessPolicy
  >;
}

function PageAccessDialogContent({
  audiences,
  createAudience,
  currentPolicy,
  deleteAudience,
  isAdmin,
  onOpenChange,
  page,
  siteId,
  updateAccessPolicy,
}: PageAccessDialogContentProps) {
  const [mode, setMode] = useState<"public" | "audiences">(currentPolicy.kind);
  const [selectedAudienceIds, setSelectedAudienceIds] = useState<string[]>(
    currentPolicy.kind === "audiences" ? currentPolicy.audienceIds : [],
  );
  const [newAudienceName, setNewAudienceName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingAudience, setIsCreatingAudience] = useState(false);
  const [isDeletingAudience, setIsDeletingAudience] = useState(false);
  const [managingAudienceId, setManagingAudienceId] = useState<string>();
  const [deletingAudienceId, setDeletingAudienceId] = useState<string>();

  const toggleAudience = (audienceId: string) => {
    setSelectedAudienceIds((current) =>
      current.includes(audienceId)
        ? current.filter(
            (existingAudienceId) => existingAudienceId !== audienceId,
          )
        : [...current, audienceId],
    );
  };

  const handleCreateAudience = async () => {
    const trimmedName = newAudienceName.trim();
    if (!trimmedName) {
      return;
    }

    setIsCreatingAudience(true);
    const audienceId = await createAudience({
      siteId: siteId as never,
      name: trimmedName,
    }).catch((error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create audience",
      );
      return null;
    });
    setIsCreatingAudience(false);
    if (!audienceId) {
      return;
    }

    setNewAudienceName("");
    setMode("audiences");
    setSelectedAudienceIds((current) =>
      current.includes(audienceId) ? current : [...current, audienceId],
    );
    toast.success(`Audience "${trimmedName}" created`);
  };

  const handleSave = async () => {
    if (mode === "audiences" && selectedAudienceIds.length === 0) {
      toast.error("Choose at least one audience");
      return;
    }

    setIsSaving(true);
    const saveError = await updateAccessPolicy({
      pageId: page._id as never,
      accessPolicy:
        mode === "public"
          ? { kind: "public" }
          : {
              kind: "audiences",
              audienceIds: selectedAudienceIds as never,
            },
    })
      .then(() => null)
      .catch((error) =>
        error instanceof Error
          ? error
          : new Error("Failed to update page access"),
      );
    setIsSaving(false);
    if (saveError) {
      toast.error(saveError.message);
      return;
    }

    toast.success("Page access updated");
    onOpenChange(false);
  };

  const deletingAudience = useMemo(
    () => audiences?.find((audience) => audience._id === deletingAudienceId),
    [audiences, deletingAudienceId],
  );

  const handleDeleteAudience = async () => {
    if (!deletingAudienceId) {
      return;
    }

    setIsDeletingAudience(true);
    const deleteError = await deleteAudience({
      audienceId: deletingAudienceId as never,
    })
      .then(() => null)
      .catch((error) =>
        error instanceof Error ? error : new Error("Failed to delete audience"),
      );
    setIsDeletingAudience(false);
    if (deleteError) {
      toast.error(deleteError.message);
      return;
    }

    setSelectedAudienceIds((current) =>
      current.filter((audienceId) => audienceId !== deletingAudienceId),
    );
    if (managingAudienceId === deletingAudienceId) {
      setManagingAudienceId(undefined);
    }
    toast.success("Audience deleted");
    setDeletingAudienceId(undefined);
  };

  return (
    <>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Page access</DialogTitle>
          <DialogDescription>
            Choose who can open {page.title}. Live changes apply on the next
            deploy.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <RadioGroup
            value={mode}
            onValueChange={(value) => setMode(value as "public" | "audiences")}
            className="space-y-3"
          >
            <Label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
              <RadioGroupItem value="public" />
              <div>
                <p className="font-medium">Public</p>
                <p className="text-sm text-muted-foreground">
                  Anyone with the site link can open this page.
                </p>
              </div>
            </Label>

            <Label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
              <RadioGroupItem value="audiences" />
              <div>
                <p className="font-medium">Specific audiences</p>
                <p className="text-sm text-muted-foreground">
                  Only signed-in members of the selected audiences can open this
                  page.
                </p>
              </div>
            </Label>
          </RadioGroup>

          {mode === "audiences" && (
            <div className="space-y-3 rounded-md border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-medium">Allowed audiences</h4>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newAudienceName}
                      onChange={(event) =>
                        setNewAudienceName(event.target.value)
                      }
                      placeholder="New audience"
                      className="h-8 w-40"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCreateAudience}
                      disabled={isCreatingAudience || !newAudienceName.trim()}
                    >
                      {isCreatingAudience ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Create"
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {audiences === undefined ? (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading audiences...
                </div>
              ) : audiences.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {isAdmin
                    ? "Create an audience, then add members."
                    : "An admin needs to create an audience first."}
                </p>
              ) : (
                <div className="space-y-2">
                  {audiences.map((audience) => (
                    <div
                      key={audience._id}
                      className="flex items-center gap-3 rounded-md border p-3"
                    >
                      <Checkbox
                        checked={selectedAudienceIds.includes(audience._id)}
                        onCheckedChange={() => toggleAudience(audience._id)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{audience.name}</p>
                          <Badge variant="secondary">
                            {audience.memberCount} member
                            {audience.memberCount === 1 ? "" : "s"}
                          </Badge>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setManagingAudienceId(audience._id)}
                          >
                            <Users className="mr-2 h-4 w-4" />
                            Members
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeletingAudienceId(audience._id)}
                            title={`Delete ${audience.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save access"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      <AudienceMembersDialog
        audienceId={managingAudienceId}
        open={!!managingAudienceId}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setManagingAudienceId(undefined);
          }
        }}
        siteId={siteId}
      />

      <ConfirmDialog
        open={!!deletingAudienceId}
        onOpenChange={(open) => {
          if (!open && !isDeletingAudience) {
            setDeletingAudienceId(undefined);
          }
        }}
        title="Delete Audience"
        description={
          <>
            Delete &ldquo;{deletingAudience?.name ?? "this audience"}&rdquo;?
            This removes all of its members and clears it from draft page access
            rules.
          </>
        }
        confirmLabel={isDeletingAudience ? "Deleting..." : "Delete"}
        variant="destructive"
        onConfirm={handleDeleteAudience}
      />
    </>
  );
}
