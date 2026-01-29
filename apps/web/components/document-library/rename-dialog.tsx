"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";

interface RenameDialogProps {
  type: "file" | "folder";
  currentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (newName: string) => Promise<void>;
}

export function RenameDialog({
  type,
  currentName,
  open,
  onOpenChange,
  onSubmit,
}: RenameDialogProps) {
  const [name, setName] = useState(currentName);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(currentName);
    }
  }, [open, currentName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name === currentName || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(name.trim());
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to rename:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rename {type}</DialogTitle>
            <DialogDescription>
              Enter a new name for this {type}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="rename-input">Name</Label>
            <Input
              id="rename-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5"
              autoFocus
              onFocus={(e) => {
                // Select filename without extension for files
                if (type === "file") {
                  const lastDot = name.lastIndexOf(".");
                  if (lastDot > 0) {
                    e.target.setSelectionRange(0, lastDot);
                    return;
                  }
                }
                e.target.select();
              }}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || name === currentName || isSubmitting}
            >
              {isSubmitting ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
