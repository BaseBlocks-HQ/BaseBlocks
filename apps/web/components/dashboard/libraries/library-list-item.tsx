"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/i18n/navigation";
import type { Id } from "@repo/backend";
import {
  Archive,
  BookOpen,
  FileText,
  Folder,
  Library,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";

export interface LibraryWithCount {
  _id: Id<"documentLibraries">;
  name: string;
  description?: string;
  icon?: string;
  siteId: Id<"sites">;
  documentCount: number;
}

interface LibraryListItemProps {
  library: LibraryWithCount;
  onEdit: (library: LibraryWithCount) => void;
  onDelete: (library: LibraryWithCount) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  library: Library,
  folder: Folder,
  file: FileText,
  book: BookOpen,
  archive: Archive,
};

export function LibraryListItem({
  library,
  onEdit,
  onDelete,
}: LibraryListItemProps) {
  const t = useTranslations();
  const IconComponent = iconMap[library.icon || "library"] || Library;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <Link
        href={`/dashboard/libraries/${library._id}`}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <IconComponent className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{library.name}</h3>
          <p className="text-sm text-muted-foreground">
            {library.documentCount}{" "}
            {library.documentCount === 1
              ? t("libraries.document")
              : t("libraries.documents")}
          </p>
        </div>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">{t("common.settings")}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(library)}>
            <Pencil className="h-4 w-4 mr-2" />
            {t("common.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(library)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t("common.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
