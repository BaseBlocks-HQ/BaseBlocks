"use client";

import type {
  FolderId,
  LibraryDialogTarget,
  LibraryFolder,
} from "@/modules/dashboard/library/types";
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
} from "@baseblocks/ui/dialog";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const rootFolderValue = "__root__";

const librarySelectTriggerClassName =
  "h-10 w-full rounded-[0.95rem] border-sidebar-border/80 bg-background/70 text-sidebar-foreground shadow-[inset_0_1px_0_hsl(var(--background)/0.35)]";

const libraryNameInputClassName =
  "h-auto border-0 bg-transparent px-0 py-0.5 text-[1.4rem] font-semibold leading-tight tracking-tight text-sidebar-foreground shadow-none placeholder:text-sidebar-foreground/40 focus-visible:ring-0 md:!text-[1.4rem] dark:bg-transparent";

export function RenameItemDialog({
  onOpenChange,
  onSubmit,
  target,
}: {
  onOpenChange: (open: boolean) => void;
  onSubmit: (target: LibraryDialogTarget, name: string) => Promise<void>;
  target: LibraryDialogTarget | null;
}) {
  const t = useTranslations("libraries.explorer");
  const tCommon = useTranslations("common");
  const tLibs = useTranslations("libraries");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(target?.name ?? "");
    setError("");
  }, [target]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setError("");
      onOpenChange(false);
      return;
    }
    if (target) {
      setName(target.name);
      setError("");
    }
    onOpenChange(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!target) return;

    const trimmed = name.trim();
    if (!trimmed) {
      setError(tLibs("nameRequired"));
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await onSubmit(target, trimmed);
      setIsSubmitting(false);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("error"));
      setIsSubmitting(false);
    }
  };

  const title =
    target?.kind === "file" ? t("renameFileTitle") : t("renameFolderTitle");

  return (
    <Dialog open={Boolean(target)} onOpenChange={handleOpenChange}>
      <DialogContent
        className={
          "overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[46rem] [&_[data-slot='dialog-close']]:top-4 [&_[data-slot='dialog-close']]:right-4"
        }
      >
        <DialogHeader className={"px-5 pt-4 pb-0"}>
          <DialogTitle className={"text-base font-semibold"}>
            {title}
          </DialogTitle>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit}
          className={cn("px-5 pb-3", "space-y-4 pb-4")}
        >
          <div>
            <Label
              htmlFor="rename-library-item"
              className="mb-0.5 block text-xs font-medium tracking-wide text-sidebar-foreground/55"
            >
              {t("itemNameLabel")}
            </Label>
            <Input
              id="rename-library-item"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              aria-invalid={!!error}
              className={libraryNameInputClassName}
              autoFocus
            />
          </div>
          {error ? (
            <p
              className={
                "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              }
            >
              {error}
            </p>
          ) : null}
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className={
                "h-8 rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm"
              }
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={"h-8 rounded-full px-4 text-sm"}
            >
              {isSubmitting ? tCommon("loading") : t("renameAction")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteItemDialog({
  onConfirm,
  onOpenChange,
  target,
}: {
  onConfirm: (target: LibraryDialogTarget) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  target: LibraryDialogTarget | null;
}) {
  const t = useTranslations("libraries.explorer");
  const tCommon = useTranslations("common");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (target) setIsDeleting(false);
  }, [target]);

  const handleConfirm = () => {
    if (!target) return;
    setIsDeleting(true);
    void onConfirm(target)
      .then(() => onOpenChange(false))
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : tCommon("error"));
      })
      .finally(() => setIsDeleting(false));
  };

  const title =
    target?.kind === "file" ? t("deleteFileTitle") : t("deleteFolderTitle");

  return (
    <AlertDialog
      open={Boolean(target)}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <AlertDialogContent className="overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[32rem]">
        <AlertDialogHeader className="px-5 pt-5 pb-0 text-left sm:text-left">
          <AlertDialogTitle className="text-base font-semibold text-balance">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-sidebar-foreground/60">
            {t("deleteItemDescription", { name: target?.name ?? "" })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="px-5 pt-3 pb-4 sm:justify-end">
          <AlertDialogCancel
            size="sm"
            className="rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {tCommon("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            size="sm"
            disabled={isDeleting}
            className="rounded-full px-4 text-sm"
            onClick={handleConfirm}
          >
            {isDeleting ? tCommon("loading") : tCommon("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function CreateFolderDialog({
  onOpenChange,
  onSubmit,
  open,
}: {
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => Promise<void>;
  open: boolean;
}) {
  const t = useTranslations("libraries.explorer");
  const tCommon = useTranslations("common");
  const tLibs = useTranslations("libraries");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setError("");
    }
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setError("");
      onOpenChange(false);
      return;
    }
    setName("");
    setError("");
    onOpenChange(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(tLibs("nameRequired"));
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await onSubmit(trimmed);
      setIsSubmitting(false);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("error"));
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={
          "overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[46rem] [&_[data-slot='dialog-close']]:top-4 [&_[data-slot='dialog-close']]:right-4"
        }
      >
        <DialogHeader className={"px-5 pt-4 pb-0"}>
          <DialogTitle className={"text-base font-semibold"}>
            {t("newFolderTitle")}
          </DialogTitle>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit}
          className={cn("px-5 pb-3", "space-y-4 pb-4")}
        >
          <div>
            <Label
              htmlFor="create-library-folder"
              className="mb-0.5 block text-xs font-medium tracking-wide text-sidebar-foreground/55"
            >
              {t("itemNameLabel")}
            </Label>
            <Input
              id="create-library-folder"
              placeholder={t("folderNamePlaceholder")}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              aria-invalid={!!error}
              className={libraryNameInputClassName}
              autoFocus
            />
          </div>
          {error ? (
            <p
              className={
                "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              }
            >
              {error}
            </p>
          ) : null}
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className={
                "h-8 rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm"
              }
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={"h-8 rounded-full px-4 text-sm"}
            >
              {isSubmitting ? tCommon("loading") : t("createFolderAction")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MoveItemDialog({
  folders,
  onOpenChange,
  onSubmit,
  target,
}: {
  folders: LibraryFolder[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    target: LibraryDialogTarget,
    targetFolderId: FolderId | undefined,
  ) => Promise<void>;
  target: LibraryDialogTarget | null;
}) {
  const t = useTranslations("libraries.explorer");
  const tCommon = useTranslations("common");
  const [targetFolderId, setTargetFolderId] = useState(rootFolderValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const folderOptions = getMoveFolderOptions(folders, target);

  useEffect(() => {
    if (target) {
      setTargetFolderId(rootFolderValue);
      setError("");
    }
  }, [target]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTargetFolderId(rootFolderValue);
      setError("");
      onOpenChange(false);
      return;
    }
    onOpenChange(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!target) return;

    setError("");
    setIsSubmitting(true);
    try {
      await onSubmit(
        target,
        targetFolderId === rootFolderValue
          ? undefined
          : (targetFolderId as FolderId),
      );
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const title =
    target?.kind === "file" ? t("moveFileTitle") : t("moveFolderTitle");

  return (
    <Dialog open={Boolean(target)} onOpenChange={handleOpenChange}>
      <DialogContent
        className={
          "overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[46rem] [&_[data-slot='dialog-close']]:top-4 [&_[data-slot='dialog-close']]:right-4"
        }
      >
        <DialogHeader className={"px-5 pt-4 pb-0"}>
          <DialogTitle className={"text-base font-semibold"}>
            {title}
          </DialogTitle>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit}
          className={cn("px-5 pb-3", "space-y-4 pb-4")}
        >
          <div className="rounded-[1.1rem] border border-sidebar-border/80 bg-background/55 p-3 shadow-[inset_0_1px_0_hsl(var(--background)/0.4)]">
            <Label className="mb-2 block text-xs font-medium tracking-wide text-sidebar-foreground/55">
              {t("destinationLabel")}
            </Label>
            <Select
              value={targetFolderId}
              onValueChange={(value) => {
                setTargetFolderId(value);
                setError("");
              }}
            >
              <SelectTrigger
                aria-invalid={!!error}
                className={librarySelectTriggerClassName}
              >
                <SelectValue placeholder={t("chooseFolderPlaceholder")} />
              </SelectTrigger>
              <SelectContent className="rounded-[1rem] border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl">
                <SelectItem
                  value={rootFolderValue}
                  className="rounded-[0.7rem] focus:bg-sidebar-accent focus:text-sidebar-accent-foreground"
                >
                  {t("libraryRoot")}
                </SelectItem>
                {folderOptions.map((folder) => (
                  <SelectItem
                    key={folder._id}
                    value={folder._id}
                    className="rounded-[0.7rem] focus:bg-sidebar-accent focus:text-sidebar-accent-foreground"
                  >
                    {getFolderOptionLabel(folder, folders)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error ? (
            <p
              className={
                "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              }
            >
              {error}
            </p>
          ) : null}
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className={
                "h-8 rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm"
              }
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={"h-8 rounded-full px-4 text-sm"}
            >
              {isSubmitting ? tCommon("loading") : t("moveAction")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function getMoveFolderOptions(
  folders: LibraryFolder[],
  target: LibraryDialogTarget | null,
) {
  if (target?.kind !== "folder") return folders;

  return folders.filter((folder) => {
    if (folder._id === target.id) return false;
    return !hasAncestor(folder, target.id, folders);
  });
}

function hasAncestor(
  folder: LibraryFolder,
  ancestorId: FolderId,
  folders: LibraryFolder[],
) {
  const foldersById = new Map(folders.map((item) => [item._id, item]));
  const visited = new Set<string>();
  let current = folder.parentId ? foldersById.get(folder.parentId) : undefined;

  while (current && !visited.has(current._id)) {
    if (current._id === ancestorId) return true;
    visited.add(current._id);
    current = current.parentId ? foldersById.get(current.parentId) : undefined;
  }

  return false;
}

function getFolderOptionLabel(folder: LibraryFolder, folders: LibraryFolder[]) {
  const foldersById = new Map(folders.map((item) => [item._id, item]));
  const names = [folder.name];
  const visited = new Set<string>([folder._id]);
  let current = folder.parentId ? foldersById.get(folder.parentId) : undefined;

  while (current && !visited.has(current._id)) {
    names.unshift(current.name);
    visited.add(current._id);
    current = current.parentId ? foldersById.get(current.parentId) : undefined;
  }

  return names.join(" / ");
}
