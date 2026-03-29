"use client";

import { Folder } from "lucide-react";
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
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
          <Folder className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-lg mb-1">
          {t("libraries.noLibraries")}
        </h3>
        <p className="text-muted-foreground text-sm">
          {t("libraries.noLibrariesDescription")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
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
