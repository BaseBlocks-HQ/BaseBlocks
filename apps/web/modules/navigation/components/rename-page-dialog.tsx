"use client";

import {
  DashboardFormDialog,
  dashboardDialogFormErrorClassName,
  dashboardDialogPrimaryFieldLabelClassName,
  dashboardDialogPrimaryInlineInputClassName,
  dashboardDialogSecondaryFieldLabelClassName,
  dashboardDialogSecondaryInlineInputClassName,
} from "@/components/dialogs";
import { SLUG_PATTERN, generateSlug } from "@/lib/validation";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type { PageListItem } from "@baseblocks/types";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

interface RenamePageDialogProps {
  page: PageListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RenamePageDialog({
  page,
  open,
  onOpenChange,
}: RenamePageDialogProps) {
  const t = useTranslations("navigation.renamePage");
  const tCommon = useTranslations("common");
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updatePage = useMutation(api.pages.mutations.update);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setSlug(generateSlug(value));
    setError("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTitle(page.title);
      setSlug(page.slug);
    }
    setError("");
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await updatePage({
        pageId: page._id as Id<"pages">,
        title,
        slug,
      });
      onOpenChange(false);
      setIsSubmitting(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("renameFailed");
      setError(message);
      toast.error(message);
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardFormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t("title")}
      description={t("description")}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitDisabled={!title.trim()}
      submitLabel={t("save")}
      submittingLabel={t("saving")}
      cancelLabel={tCommon("cancel")}
      bodyClassName="px-5 pb-3"
      formClassName="space-y-2"
    >
      <div className="space-y-2.5">
        <div>
          <Label
            htmlFor="renameTitle"
            className={dashboardDialogPrimaryFieldLabelClassName}
          >
            {t("titleLabel")}
          </Label>
          <Input
            id="renameTitle"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            aria-invalid={!!error}
            className={dashboardDialogPrimaryInlineInputClassName}
          />
        </div>
        <div>
          <Label
            htmlFor="renameSlug"
            className={dashboardDialogSecondaryFieldLabelClassName}
          >
            {t("slugLabel")}
          </Label>
          <Input
            id="renameSlug"
            value={slug}
            onChange={(e) => {
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
