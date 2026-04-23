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
import { Folder, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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

export function LibraryListItem({
  canManageLibraries,
  library,
  onEdit,
  onDelete,
  teamSlug,
}: LibraryListItemProps) {
  const t = useTranslations();

  return (
    <article className="group relative rounded-xl border bg-card p-4 transition-shadow duration-150 hover:shadow-sm">
      {/*
       * Full-card link painted first in DOM so it's behind everything else.
       * The dropdown below uses `relative z-10` to rise above this absolute layer.
       */}
      <Link
        href={getTeamLibraryDetailPath(teamSlug, library._id)}
        className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={library.name}
      />

      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Folder className="h-[18px] w-[18px]" />
          </div>

          {canManageLibraries && (
            /* relative z-10 lifts this above the absolute Link */
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
