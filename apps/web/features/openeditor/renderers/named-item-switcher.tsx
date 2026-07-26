"use client";

import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@baseblocks/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { Input } from "@baseblocks/ui/input";
import { ChevronsUpDown, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

type NamedItem = {
  id: string;
  label: string;
};

export function NamedItemSwitcher({
  activeId,
  collectionLabel,
  itemName,
  items,
  onAdd,
  onDuplicate,
  onRemove,
  onRename,
  onSelect,
}: {
  activeId: string;
  collectionLabel: string;
  itemName: string;
  items: NamedItem[];
  onAdd?: () => void;
  onDuplicate?: () => void;
  onRemove?: () => void;
  onRename?: (itemId: string, label: string) => void;
  onSelect: (itemId: string) => void;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameLabel, setRenameLabel] = useState("");
  const activeItem = items.find((item) => item.id === activeId) ?? items[0];

  if (!activeItem) return null;

  const startRename = () => {
    setRenameLabel(activeItem.label);
    setRenameOpen(true);
  };
  const finishRename = () => {
    const nextLabel = renameLabel.trim();
    if (!nextLabel) return;
    onRename?.(activeItem.id, nextLabel);
    setRenameOpen(false);
  };
  const hasActions = Boolean(onAdd || onDuplicate || onRemove || onRename);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="max-w-64 justify-between gap-2 rounded-xl"
            size="sm"
            type="button"
            variant="outline"
          >
            <span className="truncate">{activeItem.label}</span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-56">
          <DropdownMenuLabel>{collectionLabel}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            onValueChange={onSelect}
            value={activeItem.id}
          >
            {items.map((item) => (
              <DropdownMenuRadioItem key={item.id} value={item.id}>
                <span className="truncate">{item.label}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          {hasActions ? <DropdownMenuSeparator /> : null}
          {onRename ? (
            <DropdownMenuItem onSelect={startRename}>
              <Pencil />
              Rename {itemName}
            </DropdownMenuItem>
          ) : null}
          {onAdd ? (
            <DropdownMenuItem onSelect={onAdd}>
              <Plus />
              Add {itemName}
            </DropdownMenuItem>
          ) : null}
          {onDuplicate ? (
            <DropdownMenuItem onSelect={onDuplicate}>
              <Copy />
              Duplicate {itemName}
            </DropdownMenuItem>
          ) : null}
          {onRemove ? (
            <DropdownMenuItem
              disabled={items.length <= 1}
              onSelect={onRemove}
              variant="destructive"
            >
              <Trash2 />
              Remove {itemName}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog onOpenChange={setRenameOpen} open={renameOpen}>
        <DialogContent className="overflow-hidden rounded-[1.25rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              finishRename();
            }}
          >
            <DialogHeader className="px-5 pt-5 text-left">
              <DialogTitle className="text-base">Rename {itemName}</DialogTitle>
              <DialogDescription className="text-sidebar-foreground/60">
                Choose a name that makes this {itemName} easy to identify.
              </DialogDescription>
            </DialogHeader>
            <div className="px-5 py-4">
              <Input
                aria-label={`${itemName} name`}
                autoFocus
                className="rounded-xl border-sidebar-border/80 bg-background/70 text-sidebar-foreground"
                onChange={(event) => setRenameLabel(event.target.value)}
                onFocus={(event) => event.target.select()}
                value={renameLabel}
              />
            </div>
            <DialogFooter className="px-5 pb-5">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button disabled={!renameLabel.trim()} type="submit">
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
