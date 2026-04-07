"use client";

import { FormDialog } from "@/components/dialogs/form-dialog";
import { useHaptic } from "@/lib/use-haptic";
import { SLUG_PATTERN, generateSlug } from "@/lib/validation";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { cn } from "@baseblocks/ui/lib/utils";
import { nestedCardRadiusClass } from "@baseblocks/ui/nested-card";
import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface CreateSiteDialogProps {
  disabled?: boolean;
  teamId: Id<"teams">;
}

export function CreateSiteDialog({
  disabled = false,
  teamId,
}: CreateSiteDialogProps) {
  const [dialogState, setDialogState] = useState({
    open: false,
    name: "",
    slug: "",
    isSubmitting: false,
    error: "",
  });
  const t = useTranslations();
  const haptic = useHaptic();

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
        teamId,
      });
      haptic.trigger("success");
      setDialogState({
        open: false,
        name: "",
        slug: "",
        isSubmitting: false,
        error: "",
      });
    } catch (err) {
      haptic.trigger("error");
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
        <button
          className={cn(
            nestedCardRadiusClass,
            "flex min-h-[13rem] w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-muted-foreground/35 bg-transparent text-muted-foreground transition-colors",
            "hover:border-primary/45 hover:bg-accent/20 hover:text-foreground",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
          disabled={disabled}
          type="button"
        >
          <span className="flex items-center gap-2 font-medium">
            <Plus className="h-4 w-4 shrink-0" />
            {t("dashboard.createSite")}
          </span>
        </button>
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
