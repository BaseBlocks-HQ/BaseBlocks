"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

interface DeleteConfirmDialogProps {
  type: "file" | "folder" | "library";
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  hasChildren?: boolean; // For folders/libraries with content
}

export function DeleteConfirmDialog({
  type,
  name,
  open,
  onOpenChange,
  onConfirm,
  hasChildren = false,
}: DeleteConfirmDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to delete:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getDescription = () => {
    if (type === "library") {
      return `This will permanently delete the library "${name}" and all its folders and files. This action cannot be undone.`;
    }
    if (type === "folder" && hasChildren) {
      return `This will permanently delete the folder "${name}" and all its contents including subfolders and files. This action cannot be undone.`;
    }
    if (type === "folder") {
      return `This will permanently delete the folder "${name}". This action cannot be undone.`;
    }
    return `This will permanently delete "${name}". This action cannot be undone.`;
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>Delete {type}?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            {getDescription()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
