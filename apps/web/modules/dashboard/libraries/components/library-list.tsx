"use client";

import { Link } from "@/i18n/navigation";
import { getTeamLibraryDetailPath } from "@/lib/routes/team-routes";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { FolderPlus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

export interface LibraryWithCount {
  _id: Id<"documentLibraries">;
  name: string;
  siteId: Id<"sites">;
  documentCount: number;
}

interface LibraryListItemProps {
  canManageLibraries: boolean;
  library: LibraryWithCount;
  onEdit: (library: LibraryWithCount) => void;
  onDelete: (library: LibraryWithCount) => void;
  teamSlug: string;
}

function LibraryListItem({
  canManageLibraries,
  library,
  onEdit,
  onDelete,
  teamSlug,
}: LibraryListItemProps) {
  const t = useTranslations();

  return (
    <article className="group relative rounded-xl border bg-card p-4 transition-shadow duration-150 hover:shadow-sm">
      <Link
        href={getTeamLibraryDetailPath(teamSlug, library._id)}
        className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={library.name}
      />

      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <FolderPlus className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </div>

          {canManageLibraries && (
            <div className="relative z-10 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label={t("common.settings")}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(library)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    {t("common.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(library)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("common.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium leading-snug">
            {library.name}
          </h3>
          <p className="mt-0.5 tabular-nums text-xs text-muted-foreground">
            {library.documentCount === 1
              ? `1 ${t("libraries.document")}`
              : `${library.documentCount} ${t("libraries.documents")}`}
          </p>
        </div>
      </div>
    </article>
  );
}

interface LibraryListProps {
  canManageLibraries: boolean;
  libraries: LibraryWithCount[];
  onEdit: (library: LibraryWithCount) => void;
  onDelete: (library: LibraryWithCount) => void;
  teamSlug: string;
}

export function LibraryList({
  canManageLibraries,
  libraries,
  onEdit,
  onDelete,
  teamSlug,
}: LibraryListProps) {
  const t = useTranslations();

  if (libraries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <FolderPlus
            className="h-5 w-5 text-muted-foreground"
            strokeWidth={1.75}
          />
        </div>
        <p className="mb-0.5 text-sm font-medium">
          {t("libraries.noLibraries")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("libraries.noLibrariesDescription")}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {libraries.map((library) => (
        <LibraryListItem
          key={library._id}
          canManageLibraries={canManageLibraries}
          library={library}
          onEdit={onEdit}
          onDelete={onDelete}
          teamSlug={teamSlug}
        />
      ))}
    </div>
  );
}
