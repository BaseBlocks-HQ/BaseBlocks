"use client";

import { Link } from "@/i18n/navigation";
import type { Id } from "@repo/backend";
import { Button } from "@repo/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { Folder, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

export interface LibraryWithCount {
  _id: Id<"documentLibraries">;
  name: string;
  siteId: Id<"sites">;
  documentCount: number;
}

interface LibraryListItemProps {
  library: LibraryWithCount;
  onEdit: (library: LibraryWithCount) => void;
  onDelete: (library: LibraryWithCount) => void;
}

export function LibraryListItem({
  library,
  onEdit,
  onDelete,
}: LibraryListItemProps) {
  const t = useTranslations();

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <Link
        href={`/dashboard/libraries/${library._id}`}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Folder className="h-5 w-5" />
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
