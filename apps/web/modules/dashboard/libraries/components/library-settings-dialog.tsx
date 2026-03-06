"use client";

import { FormDialog } from "@/components/dialogs/form-dialog";
import { api } from "@baseblocks/backend";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { LibraryWithCount } from "./library-list-item";

interface LibrarySettingsDialogProps {
  library: LibraryWithCount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
    if (newOpen && library) {
      setName(library.name);
      setError("");
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!library) return;

    setError("");
    setIsSubmitting(true);

    try {
      await updateLibrary({
        libraryId: library._id,
        name,
      });
      onOpenChange(false);
      setIsSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t("libraries.editTitle")}
      description={t("libraries.editDescription")}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel={t("common.save")}
      submittingLabel={t("common.loading")}
    >
      <div className="space-y-2">
        <Label htmlFor="editLibraryName">{t("libraries.nameLabel")}</Label>
        <Input
          id="editLibraryName"
          placeholder={t("libraries.namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </FormDialog>
  );
}
