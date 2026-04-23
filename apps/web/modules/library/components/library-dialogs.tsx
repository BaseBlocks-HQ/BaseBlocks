"use client";

import type {
  FolderId,
  LibraryDialogTarget,
  LibraryFolder,
} from "@/modules/library/types";
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@baseblocks/ui/dialog";
import { Input } from "@baseblocks/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { useEffect, useState } from "react";

export function RenameItemDialog({
  onOpenChange,
  onSubmit,
  target,
}: {
  onOpenChange: (open: boolean) => void;
  onSubmit: (target: LibraryDialogTarget, name: string) => Promise<void>;
  target: LibraryDialogTarget | null;
}) {
  const [name, setName] = useState("");

  useEffect(() => {
    setName(target?.name ?? "");
  }, [target]);

  const submit = async () => {
    const nextName = name.trim();
    if (!target || !nextName) return;
    await onSubmit(target, nextName);
    onOpenChange(false);
  };

  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename {target?.kind}</DialogTitle>
        </DialogHeader>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submit();
          }}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!name.trim()}>
            Rename
          </Button>
        </DialogFooter>
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
  const submit = async () => {
    if (!target) return;
    await onConfirm(target);
    onOpenChange(false);
  };

  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {target?.kind}?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This will permanently delete "{target?.name}".
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void submit()}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) setName("");
  }, [open]);

  const submit = async () => {
    const nextName = name.trim();
    if (!nextName) return;
    await onSubmit(nextName);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Folder name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submit();
          }}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!name.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const rootFolderValue = "__root__";

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
  const [targetFolderId, setTargetFolderId] = useState(rootFolderValue);
  const folderOptions = getMoveFolderOptions(folders, target);

  const submit = async () => {
    if (!target) return;
    await onSubmit(
      target,
      targetFolderId === rootFolderValue
        ? undefined
        : (targetFolderId as FolderId),
    );
    onOpenChange(false);
    setTargetFolderId(rootFolderValue);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTargetFolderId(rootFolderValue);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={Boolean(target)} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move {target?.kind}</DialogTitle>
        </DialogHeader>
        <Select value={targetFolderId} onValueChange={setTargetFolderId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose folder" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={rootFolderValue}>Library root</SelectItem>
            {folderOptions.map((folder) => (
              <SelectItem key={folder._id} value={folder._id}>
                {getFolderOptionLabel(folder, folders)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()}>Move</Button>
        </DialogFooter>
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
