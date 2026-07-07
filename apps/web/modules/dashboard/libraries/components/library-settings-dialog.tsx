"use client";

import { api } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@baseblocks/ui/dialog";
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={
          "overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[46rem] [&_[data-slot='dialog-close']]:top-4 [&_[data-slot='dialog-close']]:right-4"
        }
      >
        <DialogHeader className={"px-5 pt-4 pb-0"}>
          <DialogTitle className={"text-base font-semibold"}>
            {t("libraries.editTitle")}
          </DialogTitle>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit}
          className={cn("px-5 pb-3", "space-y-4 pb-4")}
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

          {error ? (
            <p
              className={
                "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              }
            >
              {error}
            </p>
          ) : null}
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className={
                "h-8 rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm"
              }
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={"h-8 rounded-full px-4 text-sm"}
            >
              {isSubmitting ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
