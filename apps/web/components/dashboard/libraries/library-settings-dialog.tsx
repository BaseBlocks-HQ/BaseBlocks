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
import { useMutation } from "convex/react";
import {
  Archive,
  BookOpen,
  FileText,
  Folder,
  Library,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { LibraryWithCount } from "./library-list-item";

interface LibrarySettingsDialogProps {
  library: LibraryWithCount | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LIBRARY_ICONS = [
  { value: "library", label: "Library", Icon: Library },
  { value: "folder", label: "Folder", Icon: Folder },
  { value: "file", label: "File", Icon: FileText },
  { value: "book", label: "Book", Icon: BookOpen },
  { value: "archive", label: "Archive", Icon: Archive },
];

export function LibrarySettingsDialog({
  library,
  open,
  onOpenChange,
}: LibrarySettingsDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("library");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const t = useTranslations();

  const updateLibrary = useMutation(api.documentLibraries.mutations.update);

  // Reset form when library changes
  useEffect(() => {
    if (library) {
      setName(library.name);
      setDescription(library.description || "");
      setIcon(library.icon || "library");
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
        description: description || undefined,
        icon,
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

      <div className="space-y-2">
        <Label htmlFor="editLibraryDescription">
          {t("libraries.descriptionLabel")}
        </Label>
        <Textarea
          id="editLibraryDescription"
          placeholder={t("libraries.descriptionPlaceholder")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="editLibraryIcon">{t("libraries.iconLabel")}</Label>
        <Select value={icon} onValueChange={setIcon}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LIBRARY_ICONS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                <div className="flex items-center gap-2">
                  <item.Icon className="h-4 w-4" />
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
