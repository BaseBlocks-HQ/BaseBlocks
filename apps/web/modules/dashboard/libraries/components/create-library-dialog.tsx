"use client";

import { FormDialog } from "@/components/dialogs/form-dialog";
import { api } from "@baseblocks/backend";
import type { Doc, Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
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
      siteId: defaultSiteId || "",
      name: "",
      error: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDialogState((current) => ({
      ...current,
      error: "",
      isSubmitting: true,
    }));
    if (!dialogState.siteId) {
      setDialogState((current) => ({
        ...current,
        error: "Site is required",
        isSubmitting: false,
      }));
      return;
    }

    void createLibrary({
      siteId: dialogState.siteId as Id<"sites">,
      name: dialogState.name,
    })
      .then(() => {
        setDialogState((current) => ({
          ...current,
          open: false,
        }));
        resetForm();
      })
      .catch((err) => {
        setDialogState((current) => ({
          ...current,
          error: err instanceof Error ? err.message : t("common.error"),
        }));
      })
      .finally(() => {
        setDialogState((current) => ({
          ...current,
          isSubmitting: false,
        }));
      });
  };

  return (
    <FormDialog
      open={dialogState.open}
      onOpenChange={(isOpen) => {
        setDialogState((current) => ({
          ...current,
          open: isOpen,
        }));
        if (!isOpen) resetForm();
      }}
      title={t("libraries.createTitle")}
      description={t("libraries.createDescription")}
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
    >
      <div className="space-y-2">
        <Label htmlFor="librarySite">{t("libraries.siteLabel")}</Label>
        <Select
          value={dialogState.siteId}
          onValueChange={(siteId) =>
            setDialogState((current) => ({
              ...current,
              siteId,
            }))
          }
          required
        >
          <SelectTrigger>
            <SelectValue placeholder={t("libraries.selectSite")} />
          </SelectTrigger>
          <SelectContent>
            {sites.map((site) => (
              <SelectItem key={site._id} value={site._id}>
                {site.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="libraryName">{t("libraries.nameLabel")}</Label>
        <Input
          id="libraryName"
          placeholder={t("libraries.namePlaceholder")}
          value={dialogState.name}
          onChange={(e) =>
            setDialogState((current) => ({
              ...current,
              name: e.target.value,
            }))
          }
          required
        />
      </div>

      {dialogState.error && (
        <p className="text-sm text-destructive">{dialogState.error}</p>
      )}
    </FormDialog>
  );
}
