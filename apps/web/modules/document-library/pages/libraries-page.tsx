"use client";

import { Link } from "@/i18n/navigation";
import { getTeamLibraryDetailPath } from "@/modules/dashboard/routes";
import { useTeamAccess } from "@/modules/workspace/team-access";
import { api } from "@baseblocks/backend";
import type { Doc, Id } from "@baseblocks/backend";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@baseblocks/ui/alert-dialog";
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@baseblocks/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { cn } from "@baseblocks/ui/lib/utils";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { Spinner } from "@baseblocks/ui/spinner";
import { useMutation, useQuery } from "convex/react";
import {
  ChevronDown,
  FolderPlus,
  Globe,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface LibraryWithCount {
  _id: Id<"documentLibraries">;
  name: string;
  siteId: Id<"sites">;
  documentCount: number;
}

const libraryNameInputClassName =
  "h-auto border-0 bg-transparent px-0 py-0.5 text-[1.4rem] font-semibold leading-tight tracking-tight text-sidebar-foreground shadow-none placeholder:text-sidebar-foreground/40 focus-visible:ring-0 md:!text-[1.4rem] dark:bg-transparent";

function CreateLibraryDialog({
  defaultSiteId,
  sites,
}: {
  defaultSiteId?: string;
  sites: Doc<"sites">[];
}) {
  const [dialogState, setDialogState] = useState({
    open: false,
    siteId: defaultSiteId || "",
    name: "",
    isSubmitting: false,
    error: "",
  });
  const t = useTranslations();
  const createLibrary = useMutation(api.documentLibraries.mutations.create);

  const resetForm = () => {
    setDialogState({
      open: false,
      siteId: defaultSiteId || "",
      name: "",
      isSubmitting: false,
      error: "",
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!dialogState.siteId) {
      setDialogState((current) => ({
        ...current,
        error: t("libraries.siteRequired"),
      }));
      return;
    }

    const trimmedName = dialogState.name.trim();
    if (!trimmedName) {
      setDialogState((current) => ({
        ...current,
        error: t("libraries.nameRequired"),
      }));
      return;
    }

    setDialogState((current) => ({
      ...current,
      error: "",
      isSubmitting: true,
    }));

    try {
      await createLibrary({
        siteId: dialogState.siteId as Id<"sites">,
        name: trimmedName,
      });
      resetForm();
    } catch (error) {
      setDialogState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : t("common.error"),
        isSubmitting: false,
      }));
    }
  };

  return (
    <Dialog
      open={dialogState.open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          resetForm();
          return;
        }
        setDialogState((current) => ({ ...current, open: true, error: "" }));
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t("libraries.create")}
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[46rem] [&_[data-slot='dialog-close']]:right-4 [&_[data-slot='dialog-close']]:top-4">
        <DialogHeader className="px-5 pt-4 pb-0">
          <DialogTitle className="text-base font-semibold">
            {t("libraries.createTitle")}
          </DialogTitle>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit}
          className="space-y-4 px-5 pb-4"
        >
          <div className="space-y-3">
            <div>
              <Label
                htmlFor="libraryName"
                className="mb-0.5 block text-xs font-medium tracking-wide text-sidebar-foreground/55"
              >
                {t("libraries.nameLabel")}
              </Label>
              <Input
                id="libraryName"
                placeholder={t("libraries.namePlaceholder")}
                value={dialogState.name}
                onChange={(event) =>
                  setDialogState((current) => ({
                    ...current,
                    name: event.target.value,
                    error: "",
                  }))
                }
                aria-invalid={!!dialogState.error}
                className={libraryNameInputClassName}
              />
            </div>

            <div className="rounded-[1.1rem] border border-sidebar-border/80 bg-background/55 p-3 shadow-[inset_0_1px_0_hsl(var(--background)/0.4)]">
              <Label className="mb-2 block text-xs font-medium tracking-wide text-sidebar-foreground/55">
                {t("libraries.siteLabel")}
              </Label>
              <Select
                value={dialogState.siteId}
                onValueChange={(siteId) =>
                  setDialogState((current) => ({
                    ...current,
                    siteId,
                    error: "",
                  }))
                }
              >
                <SelectTrigger
                  aria-invalid={!!dialogState.error}
                  className="h-10 w-full rounded-[0.95rem] border-sidebar-border/80 bg-background/70 text-sidebar-foreground shadow-[inset_0_1px_0_hsl(var(--background)/0.35)]"
                >
                  <SelectValue placeholder={t("libraries.selectSite")} />
                </SelectTrigger>
                <SelectContent className="rounded-[1rem] border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl">
                  {sites.map((site) => (
                    <SelectItem
                      key={site._id}
                      value={site._id}
                      className="rounded-[0.7rem] focus:bg-sidebar-accent focus:text-sidebar-accent-foreground"
                    >
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {dialogState.error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {dialogState.error}
            </p>
          ) : null}
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              disabled={dialogState.isSubmitting}
              className="h-8 rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={dialogState.isSubmitting}
              className="h-8 rounded-full px-4 text-sm"
            >
              {dialogState.isSubmitting
                ? t("common.loading")
                : t("libraries.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LibrarySettingsDialog({
  library,
  onOpenChange,
  open,
}: {
  library: LibraryWithCount | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [name, setName] = useState(library?.name ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const t = useTranslations();
  const updateLibrary = useMutation(api.documentLibraries.mutations.update);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setError("");
      setIsSubmitting(false);
      onOpenChange(false);
      return;
    }

    if (library) setName(library.name);
    setError("");
    setIsSubmitting(false);
    onOpenChange(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!library) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("libraries.nameRequired"));
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await updateLibrary({ libraryId: library._id, name: trimmedName });
      onOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : t("common.error"),
      );
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[46rem] [&_[data-slot='dialog-close']]:right-4 [&_[data-slot='dialog-close']]:top-4">
        <DialogHeader className="px-5 pt-4 pb-0">
          <DialogTitle className="text-base font-semibold">
            {t("libraries.editTitle")}
          </DialogTitle>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit}
          className="space-y-4 px-5 pb-4"
        >
          <div>
            <Label
              htmlFor="editLibraryName"
              className="mb-0.5 block text-xs font-medium tracking-wide text-sidebar-foreground/55"
            >
              {t("libraries.nameLabel")}
            </Label>
            <Input
              id="editLibraryName"
              placeholder={t("libraries.namePlaceholder")}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
              aria-invalid={!!error}
              className={libraryNameInputClassName}
            />
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="h-8 rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-8 rounded-full px-4 text-sm"
            >
              {isSubmitting ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LibraryList({
  canManageLibraries,
  libraries,
  onDelete,
  onEdit,
  teamSlug,
}: {
  canManageLibraries: boolean;
  libraries: LibraryWithCount[];
  onDelete: (library: LibraryWithCount) => void;
  onEdit: (library: LibraryWithCount) => void;
  teamSlug: string;
}) {
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
        <article
          key={library._id}
          className="group relative rounded-xl border bg-card p-4 transition-shadow duration-150 hover:shadow-sm"
        >
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
      ))}
    </div>
  );
}

export function LibrariesPage() {
  const t = useTranslations();
  const [editingLibrary, setEditingLibrary] = useState<LibraryWithCount | null>(
    null,
  );
  const [deletingLibrary, setDeletingLibrary] =
    useState<LibraryWithCount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [collapsedSites, setCollapsedSites] = useState<Set<string>>(new Set());

  const { capabilities, team } = useTeamAccess();
  const sites = useQuery(api.sites.queries.listByTeam, {
    teamId: team._id,
  });
  const deleteLibrary = useMutation(api.documentLibraries.mutations.remove);

  const siteLibraries = useQuery(
    api.documentLibraries.queries.listAllWithCounts,
    sites ? { teamId: team._id } : "skip",
  );

  const toggleSite = (siteId: string) => {
    setCollapsedSites((prev) => {
      const next = new Set(prev);
      if (next.has(siteId)) next.delete(siteId);
      else next.add(siteId);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!deletingLibrary) return;
    setIsDeleting(true);
    try {
      await deleteLibrary({ libraryId: deletingLibrary._id });
      setDeletingLibrary(null);
      setIsDeleting(false);
    } catch (_error) {
      setIsDeleting(false);
    }
  };

  const librariesBySite = new Map<string, LibraryWithCount[]>();
  if (siteLibraries) {
    for (const library of siteLibraries) {
      const siteId = library.siteId;
      if (!librariesBySite.has(siteId)) librariesBySite.set(siteId, []);
      librariesBySite.get(siteId)!.push(library);
    }
  }

  if (sites === undefined) {
    return (
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-6 sm:px-6">
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-6 sm:px-6">
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto w-full max-w-[64rem]">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-2xl font-bold">{t("libraries.title")}</h1>
            {capabilities.canManageLibraries && sites && sites.length > 0 && (
              <CreateLibraryDialog sites={sites} />
            )}
          </div>

          {sites.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Globe className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mb-1 font-medium">{t("libraries.noSites")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("libraries.noSitesDescription")}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {sites.map((site: Doc<"sites">) => {
                const libraries = librariesBySite.get(site._id) || [];
                const isCollapsed = collapsedSites.has(site._id);

                return (
                  <div key={site._id}>
                    <button
                      type="button"
                      onClick={() => toggleSite(site._id)}
                      className="mb-4 flex w-full items-center gap-2 py-1 text-left"
                    >
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150",
                          isCollapsed && "-rotate-90",
                        )}
                      />
                      <h2 className="text-sm font-medium">{site.name}</h2>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
                        {libraries.length}
                      </span>
                    </button>

                    {!isCollapsed && (
                      <LibraryList
                        canManageLibraries={capabilities.canManageLibraries}
                        libraries={libraries}
                        onEdit={setEditingLibrary}
                        onDelete={setDeletingLibrary}
                        teamSlug={team.slug}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {capabilities.canManageLibraries && (
            <LibrarySettingsDialog
              library={editingLibrary}
              open={!!editingLibrary}
              onOpenChange={(open) => !open && setEditingLibrary(null)}
            />
          )}

          {capabilities.canManageLibraries && (
            <AlertDialog
              open={!!deletingLibrary}
              onOpenChange={(open) => !open && setDeletingLibrary(null)}
            >
              <AlertDialogContent className="overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[32rem]">
                <AlertDialogHeader className="px-5 pt-5 pb-0 text-left sm:text-left">
                  <AlertDialogTitle className="text-base font-semibold text-balance">
                    {t("libraries.deleteTitle")}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-sm text-sidebar-foreground/60">
                    {t("libraries.deleteDescription", {
                      name: deletingLibrary?.name ?? "",
                    })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="px-5 pt-3 pb-4 sm:justify-end">
                  <AlertDialogCancel
                    size="sm"
                    className="rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    {t("common.cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    size="sm"
                    disabled={isDeleting}
                    className="rounded-full px-4 text-sm"
                    onClick={handleDelete}
                  >
                    {isDeleting ? t("common.loading") : t("common.delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </ScrollArea>
    </main>
  );
}
