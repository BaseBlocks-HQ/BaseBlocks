"use client";

import { FormDialog } from "@/components/dialogs/form-dialog";
import { api } from "@baseblocks/backend";
import type { Doc } from "@baseblocks/backend";
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
  const [open, setOpen] = useState(false);
  const [siteId, setSiteId] = useState(defaultSiteId || "");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const t = useTranslations();

  const createLibrary = useMutation(api.documentLibraries.mutations.create);

  const resetForm = () => {
    setName("");
    setSiteId(defaultSiteId || "");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await createLibrary({
        siteId: siteId as any,
        name,
      });
      setOpen(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
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
      isSubmitting={isSubmitting}
      submitLabel={t("libraries.create")}
      submittingLabel={t("common.loading")}
    >
      <div className="space-y-2">
        <Label htmlFor="librarySite">{t("libraries.siteLabel")}</Label>
        <Select value={siteId} onValueChange={setSiteId} required>
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
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </FormDialog>
  );
}
