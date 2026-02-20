"use client";

import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@baseblocks/ui/dialog";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
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
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName(currentName);
      setError("");
    }
  }, [open, currentName]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setError("");
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name === currentName || isSubmitting) return;

    setError("");
    setIsSubmitting(true);
    try {
      await onSubmit(name.trim());
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : `Failed to rename ${type}`;
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rename {type}</DialogTitle>
            <DialogDescription>
              Enter a new name for this {type}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-2">
            <Label htmlFor="rename-input">Name</Label>
            <Input
              id="rename-input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
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
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
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
