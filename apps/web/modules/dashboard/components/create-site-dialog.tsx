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
            "group relative flex min-h-[13rem] w-full flex-col items-center justify-center gap-3 overflow-hidden border-2 border-dashed border-muted-foreground/35 bg-transparent text-muted-foreground transition-[transform,border-color,background-color,color,box-shadow] duration-200 ease-out",
            "hover:-translate-y-0.5 hover:border-primary/28 hover:bg-accent/14 hover:text-foreground hover:shadow-[0_10px_28px_hsl(var(--primary)/0.08)]",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
            "active:scale-[0.98]",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
          disabled={disabled}
          type="button"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.018] via-transparent to-transparent opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100" />
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card shadow-[inset_0_1px_0_hsl(var(--background)/0.5)] transition-colors duration-200 ease-out group-hover:border-primary/25 group-hover:bg-background">
            <Plus className="h-4 w-4 shrink-0" />
          </span>
          <span className="relative flex items-center gap-2 font-medium">
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
