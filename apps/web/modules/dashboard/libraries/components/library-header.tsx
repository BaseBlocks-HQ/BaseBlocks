"use client";

import { Link } from "@/i18n/navigation";
import { getTeamLibrariesPath } from "@/lib/routes/team-routes";
import type { Doc, Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { ArrowLeft, Folder, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { LibrarySearch } from "./library-search";

interface LibraryHeaderProps {
  canManageLibraries: boolean;
  library: Doc<"documentLibraries">;
  libraryId: Id<"documentLibraries">;
  onEdit: () => void;
  onDelete: () => void;
  teamSlug: string;
}

export function LibraryHeader({
  canManageLibraries,
  library,
  libraryId,
  onEdit,
  onDelete,
  teamSlug,
}: LibraryHeaderProps) {
  const t = useTranslations();

  return (
    <div className="flex items-center gap-2 border-b px-3 py-2.5">
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
        <Link href={getTeamLibrariesPath(teamSlug)}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">{t("common.back")}</span>
        </Link>
      </Button>

      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Folder className="h-3.5 w-3.5" />
        </div>
        <h1 className="max-w-[200px] truncate text-sm font-semibold">
          {library.name}
        </h1>
      </div>

      <div className="mx-1 h-4 w-px shrink-0 bg-border" />

      <div className="min-w-0 flex-1 max-w-sm">
        <LibrarySearch libraryId={libraryId} />
      </div>

      {canManageLibraries && (
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
            {t("common.edit")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
            aria-label={t("common.delete")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
