"use client";

import { FormDialog } from "@/components/dialogs/form-dialog";
import { SLUG_PATTERN, generateSlug } from "@/lib/validation";
import { api } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function CreateSiteDialog() {
  const [dialogState, setDialogState] = useState({
    open: false,
    name: "",
    slug: "",
    isSubmitting: false,
    error: "",
  });
  const t = useTranslations();

  const createSite = useMutation(api.sites.mutations.create);

  const handleNameChange = (value: string) => {
    setDialogState((current) => ({
      ...current,
      name: value,
      slug: generateSlug(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDialogState((current) => ({
      ...current,
      error: "",
      isSubmitting: true,
    }));

    try {
      await createSite({
        name: dialogState.name,
        slug: dialogState.slug,
      });
      setDialogState({
        open: false,
        name: "",
        slug: "",
        isSubmitting: false,
        error: "",
      });
    } catch (err) {
      setDialogState((current) => ({
        ...current,
        error: err instanceof Error ? err.message : t("common.error"),
        isSubmitting: false,
      }));
    }
  };

  return (
    <FormDialog
      open={dialogState.open}
      onOpenChange={(open) =>
        setDialogState((current) => ({
          ...current,
          open,
        }))
      }
      title={t("dialogs.createSite.title")}
      description={t("dialogs.createSite.description")}
      trigger={
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t("dashboard.createSite")}
        </Button>
      }
      onSubmit={handleSubmit}
      isSubmitting={dialogState.isSubmitting}
      submitLabel={t("dialogs.createSite.create")}
      submittingLabel={t("dialogs.createSite.creating")}
    >
      <div className="space-y-2">
        <Label htmlFor="siteName">{t("dialogs.createSite.nameLabel")}</Label>
        <Input
          id="siteName"
          placeholder={t("dialogs.createSite.namePlaceholder")}
          value={dialogState.name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="siteSlug">URL Slug</Label>
        <Input
          id="siteSlug"
          placeholder="engineering-docs"
          value={dialogState.slug}
          onChange={(e) =>
            setDialogState((current) => ({
              ...current,
              slug: e.target.value.toLowerCase(),
            }))
          }
          required
          pattern={SLUG_PATTERN}
        />
      </div>

      {dialogState.error && (
        <p className="text-sm text-destructive">{dialogState.error}</p>
      )}
    </FormDialog>
  );
}
