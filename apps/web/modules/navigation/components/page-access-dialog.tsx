"use client";

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
import { useMutation } from "convex/react";
import { Loader2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  const [mode, setMode] = useState<"public" | "audiences">("public");
  const [selectedAudienceIds, setSelectedAudienceIds] = useState<string[]>([]);
  const [newAudienceName, setNewAudienceName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingAudience, setIsCreatingAudience] = useState(false);
  const [managingAudienceId, setManagingAudienceId] = useState<string>();

  const currentPolicy = useMemo(
    () => normalizePageAccessPolicy(page.accessPolicy),
    [page.accessPolicy],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setMode(currentPolicy.kind);
    setSelectedAudienceIds(
      currentPolicy.kind === "audiences" ? currentPolicy.audienceIds : [],
    );
    setNewAudienceName("");
  }, [currentPolicy, open]);

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
    try {
      const audienceId = await createAudience({
        siteId: siteId as never,
        name: trimmedName,
      });
      setNewAudienceName("");
      setMode("audiences");
      setSelectedAudienceIds((current) =>
        current.includes(audienceId) ? current : [...current, audienceId],
      );
      toast.success(`Audience "${trimmedName}" created`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create audience",
      );
    } finally {
      setIsCreatingAudience(false);
    }
  };

  const handleSave = async () => {
    if (mode === "audiences" && selectedAudienceIds.length === 0) {
      toast.error("Choose at least one audience");
      return;
    }

    setIsSaving(true);
    try {
      await updateAccessPolicy({
        pageId: page._id as never,
        accessPolicy:
          mode === "public"
            ? { kind: "public" }
            : {
                kind: "audiences",
                audienceIds: selectedAudienceIds as never,
              },
      });
      toast.success("Page access updated");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update page access",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Page access</DialogTitle>
            <DialogDescription>
              Choose whether {page.title} is visible to everyone or only to
              specific signed-in audiences. Access changes go live on the next
              deploy.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <RadioGroup
              value={mode}
              onValueChange={(value) =>
                setMode(value as "public" | "audiences")
              }
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
                  <p className="font-medium">Restricted to audiences</p>
                  <p className="text-sm text-muted-foreground">
                    Hide this page from navigation and direct visits unless the
                    viewer is signed in and belongs to an allowed audience.
                  </p>
                </div>
              </Label>
            </RadioGroup>

            {mode === "audiences" && (
              <div className="space-y-3 rounded-md border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-medium">Allowed audiences</h4>
                    <p className="text-sm text-muted-foreground">
                      Pick one or more audiences for this page.
                    </p>
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
                      ? "Create an audience, then add members to it."
                      : "An admin needs to create audiences before you can restrict this page."}
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
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setManagingAudienceId(audience._id)}
                          >
                            <Users className="mr-2 h-4 w-4" />
                            Members
                          </Button>
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
      </Dialog>

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
    </>
  );
}
