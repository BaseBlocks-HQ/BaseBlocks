"use client";

import { FolderPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { LibraryListItem, type LibraryWithCount } from "./library-list-item";

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
