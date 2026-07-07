"use client";

import {
  DashboardFormDialog,
  dashboardDialogFormErrorClassName,
  dashboardDialogPrimaryFieldLabelClassName,
  dashboardDialogPrimaryInlineInputClassName,
  dashboardDialogSecondaryFieldLabelClassName,
  dashboardDialogSecondaryInlineInputClassName,
} from "@/modules/shared/dialogs";
import { useHaptic } from "@/lib/use-haptic";
import { SLUG_PATTERN, generateSlug, uniqueSlugAmong } from "@/lib/validation";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

interface CreatePageDialogProps {
  siteId: string;
  parentId?: string;
}

export function CreatePageDialog({ siteId, parentId }: CreatePageDialogProps) {
  const t = useTranslations("dialogs.createPage");
  const tCommon = useTranslations("common");

  const [dialogState, setDialogState] = useState({
    open: false,
    title: "",
    slug: "",
    isSubmitting: false,
    error: "",
  });

  const [slugLockedByUser, setSlugLockedByUser] = useState(false);

  const haptic = useHaptic();
  const createPage = useMutation(api.pages.mutations.create);
  const pages = useQuery(
    api.pages.queries.list,
    dialogState.open ? { siteId: siteId as Id<"sites"> } : "skip",
  );
  const usedSlugs = new Set(
    (pages ?? []).map((page) => page.slug.toLowerCase()),
  );
  const autoSlug = uniqueSlugAmong(generateSlug(dialogState.title), usedSlugs);
  const slugValue = slugLockedByUser ? dialogState.slug : autoSlug;

  const handleTitleChange = (value: string) => {
    setSlugLockedByUser(false);
    setDialogState((current) => {
      return {
        ...current,
        title: value,
        error: "",
      };
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSlugLockedByUser(false);
    }
    setDialogState((current) => ({
      ...current,
      open: newOpen,
      error: newOpen ? current.error : "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDialogState((current) => ({
      ...current,
      error: "",
      isSubmitting: true,
    }));

    try {
      await createPage({
        siteId: siteId as Id<"sites">,
        title: dialogState.title,
        slug: slugValue,
        parentId: parentId as Id<"pages"> | undefined,
      });
      haptic.trigger("success");
      setSlugLockedByUser(false);
      setDialogState({
        open: false,
        title: "",
        slug: "",
        isSubmitting: false,
        error: "",
      });
      toast.success(t("pageCreated"));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("createFailed");
      haptic.trigger("error");
      setDialogState((current) => ({
        ...current,
        error: message,
        isSubmitting: false,
      }));
      toast.error(message);
    }
  };

  return (
    <DashboardFormDialog
      open={dialogState.open}
      onOpenChange={handleOpenChange}
      title={t("title")}
      description={t("description")}
      trigger={
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Plus className="h-4 w-4" />
        </Button>
      }
      onSubmit={handleSubmit}
      isSubmitting={dialogState.isSubmitting}
      submitDisabled={!dialogState.title.trim()}
      submitLabel={t("create")}
      submittingLabel={t("creating")}
      cancelLabel={tCommon("cancel")}
      bodyClassName="px-5 pb-3"
      formClassName="space-y-2"
    >
      <div className="space-y-2.5">
        <div>
          <Label
            htmlFor="pageTitle"
            className={dashboardDialogPrimaryFieldLabelClassName}
          >
            {t("titleLabel")}
          </Label>
          <Input
            id="pageTitle"
            placeholder={t("titlePlaceholder")}
            value={dialogState.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            aria-invalid={!!dialogState.error}
            className={dashboardDialogPrimaryInlineInputClassName}
          />
        </div>
        <div>
          <Label
            htmlFor="pageSlug"
            className={dashboardDialogSecondaryFieldLabelClassName}
          >
            {t("slugLabel")}
          </Label>
          <Input
            id="pageSlug"
            placeholder={t("slugPlaceholder")}
            value={slugValue}
            onChange={(e) => {
              setSlugLockedByUser(true);
              setDialogState((current) => ({
                ...current,
                slug: e.target.value.toLowerCase(),
                error: "",
              }));
            }}
            aria-invalid={!!dialogState.error}
            pattern={SLUG_PATTERN}
            className={dashboardDialogSecondaryInlineInputClassName}
          />
        </div>
      </div>

      {dialogState.error ? (
        <p className={dashboardDialogFormErrorClassName}>{dialogState.error}</p>
      ) : null}
    </DashboardFormDialog>
  );
}
