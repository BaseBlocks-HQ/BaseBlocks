"use client";

import { cn } from "@/lib/utils";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState } from "react";

export interface FolderData {
  _id: string;
  name: string;
  parentId?: string;
  order: number;
}

interface FolderTreeItemProps {
  folder: FolderData;
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  onSelect: (folderId: string) => void;
  onToggleExpand: (folderId: string) => void;
  onRename: (folderId: string) => void;
  onDelete: (folderId: string) => void;
  onCreateSubfolder: (parentId: string) => void;
  readOnly?: boolean;
  children?: React.ReactNode;
}

export function FolderTreeItem({
  folder,
  level,
  isSelected,
  isExpanded,
  hasChildren,
  onSelect,
  onToggleExpand,
  onRename,
  onDelete,
  onCreateSubfolder,
  readOnly = false,
  children,
}: FolderTreeItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(folder._id);
  };

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer transition-colors",
          isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted/50",
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        <button
          type="button"
          onClick={handleToggle}
          className={cn(
            "flex-shrink-0 h-4 w-4 flex items-center justify-center rounded-sm hover:bg-muted",
            !hasChildren && "invisible",
          )}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1 text-left"
          onClick={() => onSelect(folder._id)}
        >
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          <span className="text-sm truncate flex-1">{folder.name}</span>
        </button>

        {!readOnly && (
          <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100",
                  showMenu && "opacity-100",
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateSubfolder(folder._id);
                  setShowMenu(false);
                }}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                New subfolder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onRename(folder._id);
                  setShowMenu(false);
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(folder._id);
                  setShowMenu(false);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {isExpanded && children}
    </div>
  );
}
