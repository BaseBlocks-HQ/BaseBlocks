"use client";

import {
  DashboardConfirmDialog,
  DashboardDialogShell,
} from "@/components/dialogs";
import { useSiteAudiences } from "@/lib/data";
import { api } from "@baseblocks/backend";
import { normalizePageAccessPolicy } from "@baseblocks/types";
import type { PageListItem } from "@baseblocks/types";
import { Badge } from "@baseblocks/ui/badge";
import { Button } from "@baseblocks/ui/button";
import { Checkbox } from "@baseblocks/ui/checkbox";
import { DialogFooter } from "@baseblocks/ui/dialog";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { RadioGroup, RadioGroupItem } from "@baseblocks/ui/radio-group";
import { useMutation } from "convex/react";
import { Loader2, Trash2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const resetKey = [
    page._id,
    open ? "open" : "closed",
    JSON.stringify(normalizePageAccessPolicy(page.accessPolicy)),
  ].join(":");

  return (
    <PageAccessDialogContent
      key={resetKey}
      isAdmin={isAdmin}
      onOpenChange={onOpenChange}
      open={open}
      page={page}
      siteId={siteId}
    />
  );
}

function PageAccessDialogContent({
  isAdmin,
  open,
  onOpenChange,
  page,
  siteId,
}: PageAccessDialogProps) {
  const t = useTranslations("navigation.pageAccess");
  const tCommon = useTranslations("common");
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
        error instanceof Error ? error.message : t("toastCreateAudienceError"),
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
    toast.success(t("toastCreateAudienceSuccess", { name: trimmedName }));
  };

  const handleSave = async () => {
    if (mode === "audiences" && selectedAudienceIds.length === 0) {
      toast.error(t("toastChooseAudience"));
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
        error instanceof Error ? error : new Error(t("toastUpdateAccessError")),
      );
    setIsSaving(false);
    if (saveError) {
      toast.error(saveError.message);
      return;
    }

    toast.success(t("toastAccessUpdated"));
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
        error instanceof Error ? error : new Error(t("toastUpdateAccessError")),
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
    toast.success(t("toastAudienceDeleted"));
    setDeletingAudienceId(undefined);
  };

  const deleteAudienceName =
    deletingAudience?.name ?? t("deleteAudienceFallbackName");

  return (
    <>
      <DashboardDialogShell
        open={open}
        onOpenChange={onOpenChange}
        title={t("title")}
        description={t("description", { pageTitle: page.title })}
        contentClassName="sm:max-w-xl"
      >
        {open ? (
          <div className="space-y-5">
            <RadioGroup
              value={mode}
              onValueChange={(value) =>
                setMode(value as "public" | "audiences")
              }
              className="space-y-3"
            >
              <Label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sidebar-border/60 bg-background/40 p-3">
                <RadioGroupItem value="public" />
                <div>
                  <p className="font-medium">{t("public")}</p>
                  <p className="text-sm text-sidebar-foreground/60">
                    {t("publicDescription")}
                  </p>
                </div>
              </Label>

              <Label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sidebar-border/60 bg-background/40 p-3">
                <RadioGroupItem value="audiences" />
                <div>
                  <p className="font-medium">{t("audiences")}</p>
                  <p className="text-sm text-sidebar-foreground/60">
                    {t("audiencesDescription")}
                  </p>
                </div>
              </Label>
            </RadioGroup>

            {mode === "audiences" ? (
              <div className="space-y-3 rounded-xl border border-sidebar-border/60 bg-sidebar-accent/15 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-medium">{t("allowedAudiences")}</h4>
                  </div>
                  {isAdmin ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={newAudienceName}
                        onChange={(event) =>
                          setNewAudienceName(event.target.value)
                        }
                        placeholder={t("newAudiencePlaceholder")}
                        className="h-8 w-40 rounded-[0.95rem] border-sidebar-border/80 bg-background/70"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCreateAudience}
                        disabled={isCreatingAudience || !newAudienceName.trim()}
                        className="h-8 rounded-full border-sidebar-border/70"
                      >
                        {isCreatingAudience ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          t("create")
                        )}
                      </Button>
                    </div>
                  ) : null}
                </div>

                {audiences === undefined ? (
                  <div className="flex items-center text-sm text-sidebar-foreground/60">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("loadingAudiences")}
                  </div>
                ) : audiences.length === 0 ? (
                  <p className="text-sm text-sidebar-foreground/60">
                    {isAdmin ? t("emptyAdmin") : t("emptyMember")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {audiences.map((audience) => (
                      <div
                        key={audience._id}
                        className="flex items-center gap-3 rounded-xl border border-sidebar-border/50 bg-background/40 p-3"
                      >
                        <Checkbox
                          checked={selectedAudienceIds.includes(audience._id)}
                          onCheckedChange={() => toggleAudience(audience._id)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{audience.name}</p>
                            <Badge variant="secondary">
                              {t("memberCount", {
                                count: audience.memberCount,
                              })}
                            </Badge>
                          </div>
                        </div>
                        {isAdmin ? (
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-full"
                              onClick={() =>
                                setManagingAudienceId(audience._id)
                              }
                            >
                              <Users className="mr-2 h-4 w-4" />
                              {t("members")}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                setDeletingAudienceId(audience._id)
                              }
                              title={t("deleteAudienceTitleAria", {
                                name: audience.name,
                              })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            <DialogFooter className="flex-row gap-2 pt-1 sm:justify-end">
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
                disabled={isSaving}
                className="h-8 rounded-full px-4 text-sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("saving")}
                  </>
                ) : (
                  t("saveAccess")
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DashboardDialogShell>

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

      <DashboardConfirmDialog
        open={!!deletingAudienceId}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isDeletingAudience) {
            setDeletingAudienceId(undefined);
          }
        }}
        title={t("deleteAudienceTitle")}
        description={t("deleteAudienceDescription", {
          name: deleteAudienceName,
        })}
        confirmLabel={
          isDeletingAudience
            ? t("deletingAudience")
            : t("deleteAudienceConfirm")
        }
        cancelLabel={tCommon("cancel")}
        confirmDisabled={isDeletingAudience}
        variant="destructive"
        onConfirm={handleDeleteAudience}
      />
    </>
  );
}
