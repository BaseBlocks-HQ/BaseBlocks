"use client";

import { FormDialog } from "@/components/dialogs/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@repo/backend";
import type { Doc } from "@repo/backend";
import { useMutation } from "convex/react";
import { Library, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CreateLibraryDialogProps {
  sites: Doc<"sites">[];
  defaultSiteId?: string;
}

const LIBRARY_ICONS = [
  { value: "library", label: "Library", icon: "Library" },
  { value: "folder", label: "Folder", icon: "Folder" },
  { value: "file", label: "File", icon: "FileText" },
  { value: "book", label: "Book", icon: "BookOpen" },
  { value: "archive", label: "Archive", icon: "Archive" },
];

export function CreateLibraryDialog({
  sites,
  defaultSiteId,
}: CreateLibraryDialogProps) {
  const [open, setOpen] = useState(false);
  const [siteId, setSiteId] = useState(defaultSiteId || "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("library");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const t = useTranslations();

  const createLibrary = useMutation(api.documentLibraries.mutations.create);

  const resetForm = () => {
    setName("");
    setDescription("");
    setIcon("library");
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
        description: description || undefined,
        icon,
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

      <div className="space-y-2">
        <Label htmlFor="libraryDescription">
          {t("libraries.descriptionLabel")}
        </Label>
        <Textarea
          id="libraryDescription"
          placeholder={t("libraries.descriptionPlaceholder")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="libraryIcon">{t("libraries.iconLabel")}</Label>
        <Select value={icon} onValueChange={setIcon}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LIBRARY_ICONS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                <div className="flex items-center gap-2">
                  <Library className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </FormDialog>
  );
}
