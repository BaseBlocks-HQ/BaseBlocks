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
import { RotateCcw } from "lucide-react";
import { useState } from "react";

interface RollbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetVersion: number;
  targetNotes?: string;
  onRollback: () => Promise<void>;
}

export function RollbackDialog({
  open,
  onOpenChange,
  targetVersion,
  targetNotes,
  onRollback,
}: RollbackDialogProps) {
  const [isRollingBack, setIsRollingBack] = useState(false);

  const handleRollback = async () => {
    setIsRollingBack(true);
    try {
      await onRollback();
      onOpenChange(false);
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Rollback to v{targetVersion}
          </DialogTitle>
          <DialogDescription>
            This will restore the live site to the state it was in at version{" "}
            {targetVersion}.
            {targetNotes && (
              <span className="block mt-1 text-foreground/70">
                &ldquo;{targetNotes}&rdquo;
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-200">
            This will change what visitors see on the live site.
          </p>
          <p className="mt-1 text-amber-700 dark:text-amber-300">
            Your draft content will not be affected &mdash; only the published
            version will change.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRollingBack}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRollback}
            disabled={isRollingBack}
          >
            {isRollingBack ? "Rolling back..." : "Rollback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
