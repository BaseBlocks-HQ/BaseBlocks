"use client";

import { cn } from "@/lib/utils";
import type { FolderData } from "@/modules/documents";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

interface FolderItemProps {
  folder: FolderData;
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onRename: () => void;
  onDelete: () => void;
  children?: React.ReactNode;
}

export function FolderItem({
  folder,
  level,
  isSelected,
  isExpanded,
  hasChildren,
  onSelect,
  onToggle,
  onRename,
  onDelete,
  children,
}: FolderItemProps) {
  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 px-2 py-1 text-sm rounded cursor-pointer",
          isSelected ? "bg-accent" : "hover:bg-muted/50",
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={onSelect}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={cn("p-0.5 shrink-0", !hasChildren && "invisible")}
        >
          <ChevronRight
            className={cn(
              "h-3 w-3 transition-transform",
              isExpanded && "rotate-90",
            )}
          />
        </button>
        {isExpanded ? (
          <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="truncate flex-1 min-w-0">{folder.name}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="p-1 opacity-0 group-hover:opacity-100 shrink-0"
            >
              <MoreHorizontal className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRename}>
              <Pencil className="h-3 w-3 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-3 w-3 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isExpanded && children}
    </div>
  );
}
