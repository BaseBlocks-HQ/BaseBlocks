"use client";

import { FormDialog } from "@/components/dialogs/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@repo/backend";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const t = useTranslations();

  const updateLibrary = useMutation(api.documentLibraries.mutations.update);

  // Reset form when library changes
  useEffect(() => {
    if (library) {
      setName(library.name);
      setError("");
    }
  }, [library]);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
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
