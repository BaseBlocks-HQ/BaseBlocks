"use client";

import { DashboardFormDialog } from "@/core/dialogs";
import { api } from "@baseblocks/backend";
import type { Doc, Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface CreateLibraryDialogProps {
  sites: Doc<"sites">[];
  defaultSiteId?: string;
}

const libraryNameInputClassName =
  "h-auto border-0 bg-transparent px-0 py-0.5 text-[1.4rem] font-semibold leading-tight tracking-tight text-sidebar-foreground shadow-none placeholder:text-sidebar-foreground/40 focus-visible:ring-0 md:!text-[1.4rem] dark:bg-transparent";

const librarySelectTriggerClassName =
  "h-10 w-full rounded-[0.95rem] border-sidebar-border/80 bg-background/70 text-sidebar-foreground shadow-[inset_0_1px_0_hsl(var(--background)/0.35)]";

export function CreateLibraryDialog({
  sites,
  defaultSiteId,
}: CreateLibraryDialogProps) {
  const [dialogState, setDialogState] = useState({
    open: false,
    siteId: defaultSiteId || "",
    name: "",
    isSubmitting: false,
    error: "",
  });
  const t = useTranslations();

  const createLibrary = useMutation(api.documentLibraries.mutations.create);

  const resetForm = () => {
    setDialogState((current) => ({
      ...current,
      open: false,
      siteId: defaultSiteId || "",
      name: "",
      isSubmitting: false,
      error: "",
    }));
  };

  // Failure modes:
  // - No site is selected
  // - Library name is empty
  // - Create mutation fails
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!dialogState.siteId) {
      setDialogState((current) => ({
        ...current,
        error: t("libraries.siteRequired"),
        isSubmitting: false,
      }));
      return;
    }

    const trimmedName = dialogState.name.trim();
    if (!trimmedName) {
      setDialogState((current) => ({
        ...current,
        error: t("libraries.nameRequired"),
        isSubmitting: false,
      }));
      return;
    }

    setDialogState((current) => ({
      ...current,
      error: "",
      isSubmitting: true,
    }));

    try {
      await createLibrary({
        siteId: dialogState.siteId as Id<"sites">,
        name: trimmedName,
      });
      resetForm();
    } catch (err) {
      setDialogState((current) => ({
        ...current,
        error: err instanceof Error ? err.message : t("common.error"),
        isSubmitting: false,
      }));
    }
  };

  return (
    <DashboardFormDialog
      open={dialogState.open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          resetForm();
          return;
        }

        setDialogState((current) => ({
          ...current,
          open: true,
          error: "",
        }));
      }}
      title={t("libraries.createTitle")}
      trigger={
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t("libraries.create")}
        </Button>
      }
      onSubmit={handleSubmit}
      isSubmitting={dialogState.isSubmitting}
      submitLabel={t("libraries.create")}
      submittingLabel={t("common.loading")}
      cancelLabel={t("common.cancel")}
      bodyClassName="px-5 pb-4"
      formClassName="space-y-4"
      footerClassName="pt-2"
    >
      <div className="space-y-3">
        <div>
          <Label
            htmlFor="libraryName"
            className="mb-0.5 block text-xs font-medium tracking-wide text-sidebar-foreground/55"
          >
            {t("libraries.nameLabel")}
          </Label>
          <Input
            id="libraryName"
            placeholder={t("libraries.namePlaceholder")}
            value={dialogState.name}
            onChange={(e) =>
              setDialogState((current) => ({
                ...current,
                name: e.target.value,
                error: "",
              }))
            }
            aria-invalid={!!dialogState.error}
            className={libraryNameInputClassName}
          />
        </div>

        <div className="rounded-[1.1rem] border border-sidebar-border/80 bg-background/55 p-3 shadow-[inset_0_1px_0_hsl(var(--background)/0.4)]">
          <Label className="mb-2 block text-xs font-medium tracking-wide text-sidebar-foreground/55">
            {t("libraries.siteLabel")}
          </Label>
          <Select
            value={dialogState.siteId}
            onValueChange={(siteId) =>
              setDialogState((current) => ({
                ...current,
                siteId,
                error: "",
              }))
            }
          >
            <SelectTrigger
              aria-invalid={!!dialogState.error}
              className={librarySelectTriggerClassName}
            >
              <SelectValue placeholder={t("libraries.selectSite")} />
            </SelectTrigger>
            <SelectContent className="rounded-[1rem] border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl">
              {sites.map((site) => (
                <SelectItem
                  key={site._id}
                  value={site._id}
                  className="rounded-[0.7rem] focus:bg-sidebar-accent focus:text-sidebar-accent-foreground"
                >
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {dialogState.error && (
        <p
          className={cn(
            "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive",
          )}
        >
          {dialogState.error}
        </p>
      )}
    </DashboardFormDialog>
  );
}
