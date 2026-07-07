"use client";

import { DashboardFormDialog } from "@/core/dialogs";
import { api } from "@baseblocks/backend";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { cn } from "@baseblocks/ui/lib/utils";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { LibraryWithCount } from "./library-list";

interface LibrarySettingsDialogProps {
  library: LibraryWithCount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const libraryNameInputClassName =
  "h-auto border-0 bg-transparent px-0 py-0.5 text-[1.4rem] font-semibold leading-tight tracking-tight text-sidebar-foreground shadow-none placeholder:text-sidebar-foreground/40 focus-visible:ring-0 md:!text-[1.4rem] dark:bg-transparent";

export function LibrarySettingsDialog({
  library,
  open,
  onOpenChange,
}: LibrarySettingsDialogProps) {
  const [name, setName] = useState(library?.name ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const t = useTranslations();

  const updateLibrary = useMutation(api.documentLibraries.mutations.update);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setError("");
      onOpenChange(false);
      return;
    }

    if (library) {
      setName(library.name);
      setError("");
    }
    onOpenChange(true);
  };

  // Failure modes:
  // - No library is selected
  // - Library name is empty
  // - Update mutation fails
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!library) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("libraries.nameRequired"));
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await updateLibrary({
        libraryId: library._id,
        name: trimmedName,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardFormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t("libraries.editTitle")}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel={t("common.save")}
      submittingLabel={t("common.loading")}
      cancelLabel={t("common.cancel")}
      bodyClassName="px-5 pb-4"
      formClassName="space-y-4"
      footerClassName="pt-2"
    >
      <div>
        <Label
          htmlFor="editLibraryName"
          className="mb-0.5 block text-xs font-medium tracking-wide text-sidebar-foreground/55"
        >
          {t("libraries.nameLabel")}
        </Label>
        <Input
          id="editLibraryName"
          placeholder={t("libraries.namePlaceholder")}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          aria-invalid={!!error}
          className={libraryNameInputClassName}
        />
      </div>

      {error && (
        <p
          className={cn(
            "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive",
          )}
        >
          {error}
        </p>
      )}
    </DashboardFormDialog>
  );
}
