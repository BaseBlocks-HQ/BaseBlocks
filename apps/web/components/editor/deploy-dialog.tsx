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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Rocket } from "lucide-react";
import { useState } from "react";

interface DeployDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeploy: (notes?: string) => Promise<void>;
}

export function DeployDialog({
  open,
  onOpenChange,
  onDeploy,
}: DeployDialogProps) {
  const [notes, setNotes] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);

  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      await onDeploy(notes.trim() || undefined);
      setNotes("");
      onOpenChange(false);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Deploy Changes
          </DialogTitle>
          <DialogDescription>
            This will publish all draft changes to the live site. Pages,
            layouts, blocks, navigation, and site settings will all be updated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="deploy-notes">Notes (optional)</Label>
            <Textarea
              id="deploy-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what changed..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeploying}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeploy}
            disabled={isDeploying}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isDeploying ? "Deploying..." : "Deploy Now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
