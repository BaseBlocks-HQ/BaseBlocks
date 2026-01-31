"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Doc } from "@repo/backend";
import {
  Archive,
  ArrowLeft,
  BookOpen,
  FileText,
  Folder,
  Library,
  Pencil,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface LibraryHeaderProps {
  library: Doc<"documentLibraries">;
  onEdit: () => void;
  onDelete: () => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  library: Library,
  folder: Folder,
  file: FileText,
  book: BookOpen,
  archive: Archive,
};

export function LibraryHeader({ library, onEdit, onDelete }: LibraryHeaderProps) {
  const t = useTranslations();
  const IconComponent = iconMap[library.icon || "library"] || Library;

  return (
    <div className="border-b">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/libraries">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">{t("common.back")}</span>
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IconComponent className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{library.name}</h1>
              {library.description && (
                <p className="text-sm text-muted-foreground">
                  {library.description}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            {t("common.edit")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t("common.delete")}
          </Button>
        </div>
      </div>
    </div>
  );
}
