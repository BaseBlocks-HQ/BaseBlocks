"use client";

import {
  DashboardFormDialog,
  dashboardDialogFormErrorClassName,
  dashboardDialogPrimaryFieldLabelClassName,
  dashboardDialogPrimaryInlineInputClassName,
  dashboardDialogSecondaryFieldLabelClassName,
  dashboardDialogSecondaryInlineInputClassName,
} from "@/core/dialogs";
import { SLUG_PATTERN, generateSlug, uniqueSlugAmong } from "@/lib/validation";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

interface CreateChildPageDialogProps {
  siteId: string;
  parentId: string;
  parentTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateChildPageDialog({
  siteId,
  parentId,
  parentTitle,
  open,
  onOpenChange,
  onSuccess,
}: CreateChildPageDialogProps) {
  const t = useTranslations("navigation.createChildPage");
  const tCommon = useTranslations("common");
  const tPageDialog = useTranslations("dialogs.createPage");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [slugLockedByUser, setSlugLockedByUser] = useState(false);

  const createPage = useMutation(api.pages.mutations.create);
  const pages = useQuery(
    api.pages.queries.list,
    open ? { siteId: siteId as Id<"sites"> } : "skip",
  );
  const usedSlugs = new Set(
    (pages ?? []).map((page) => page.slug.toLowerCase()),
  );
  const autoSlug = uniqueSlugAmong(generateSlug(title), usedSlugs);
  const slugValue = slugLockedByUser ? slug : autoSlug;

  const handleTitleChange = (value: string) => {
    setSlugLockedByUser(false);
    setTitle(value);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await createPage({
        siteId: siteId as Id<"sites">,
        title,
        slug: slugValue,
        parentId: parentId as Id<"pages">,
      });
      onOpenChange(false);
      setSlugLockedByUser(false);
      setTitle("");
      setSlug("");
      onSuccess?.();
      toast.success(tPageDialog("pageCreated"));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("createFailed");
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSlugLockedByUser(false);
      setTitle("");
      setSlug("");
      setError("");
    }
    onOpenChange(newOpen);
  };

  return (
    <DashboardFormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t("title")}
      description={t("description", { parentTitle })}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitDisabled={!title.trim()}
      submitLabel={t("create")}
      submittingLabel={t("creating")}
      cancelLabel={tCommon("cancel")}
      bodyClassName="px-5 pb-3"
      formClassName="space-y-2"
    >
      <div className="space-y-2.5">
        <div>
          <Label
            htmlFor="childPageTitle"
            className={dashboardDialogPrimaryFieldLabelClassName}
          >
            {t("titleLabel")}
          </Label>
          <Input
            id="childPageTitle"
            placeholder={t("titlePlaceholder")}
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            aria-invalid={!!error}
            className={dashboardDialogPrimaryInlineInputClassName}
          />
        </div>
        <div>
          <Label
            htmlFor="childPageSlug"
            className={dashboardDialogSecondaryFieldLabelClassName}
          >
            {t("slugLabel")}
          </Label>
          <Input
            id="childPageSlug"
            placeholder={t("slugPlaceholder")}
            value={slugValue}
            onChange={(e) => {
              setSlugLockedByUser(true);
              setSlug(e.target.value.toLowerCase());
              setError("");
            }}
            aria-invalid={!!error}
            pattern={SLUG_PATTERN}
            className={dashboardDialogSecondaryInlineInputClassName}
          />
        </div>
      </div>

      {error ? (
        <p className={dashboardDialogFormErrorClassName}>{error}</p>
      ) : null}
    </DashboardFormDialog>
  );
}
