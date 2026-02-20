"use client";

import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { Badge } from "@baseblocks/ui/badge";
import { Button } from "@baseblocks/ui/button";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@baseblocks/ui/sheet";
import { useMutation, useQuery } from "convex/react";
import { History, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { RollbackDialog } from "./rollback-dialog";

interface DeploymentHistoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: Id<"sites">;
}

export function DeploymentHistoryPanel({
  open,
  onOpenChange,
  siteId,
}: DeploymentHistoryPanelProps) {
  const deployments = useQuery(
    api.deployments.queries.list,
    open ? { siteId, limit: 50 } : "skip",
  );
  const rollbackMutation = useMutation(api.deployments.mutations.rollback);

  const [rollbackTarget, setRollbackTarget] = useState<{
    id: Id<"deployments">;
    version: number;
    notes?: string;
  } | null>(null);

  const handleRollback = async () => {
    if (!rollbackTarget) return;
    try {
      await rollbackMutation({
        siteId,
        targetDeploymentId: rollbackTarget.id,
      });
      toast.success(`Rolled back to v${rollbackTarget.version}`);
      setRollbackTarget(null);
    } catch (error) {
      console.error("Failed to rollback:", error);
      toast.error("Failed to rollback");
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-600 hover:bg-green-700 text-xs">
            Active
          </Badge>
        );
      case "superseded":
        return (
          <Badge variant="secondary" className="text-xs">
            Superseded
          </Badge>
        );
      case "rolled-back":
        return (
          <Badge
            variant="outline"
            className="text-xs text-amber-600 border-amber-300"
          >
            Rolled back
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Deployment History
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
            {deployments === undefined ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 rounded-lg bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : deployments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No deployments yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {deployments.map((deployment) => (
                  <div
                    key={deployment._id}
                    className="rounded-lg border p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        v{deployment.version}
                      </span>
                      {statusBadge(deployment.status)}
                    </div>

                    {deployment.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {deployment.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {deployment.summary.pagesDeployed} pages,{" "}
                        {deployment.summary.layoutsDeployed} layouts
                      </span>
                      <span>{formatDate(deployment.deployedAt)}</span>
                    </div>

                    {deployment.status !== "active" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full gap-1.5 text-xs"
                        onClick={() =>
                          setRollbackTarget({
                            id: deployment._id,
                            version: deployment.version,
                            notes: deployment.notes,
                          })
                        }
                      >
                        <RotateCcw className="h-3 w-3" />
                        Rollback to this version
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {rollbackTarget && (
        <RollbackDialog
          open={!!rollbackTarget}
          onOpenChange={(open) => {
            if (!open) setRollbackTarget(null);
          }}
          targetVersion={rollbackTarget.version}
          targetNotes={rollbackTarget.notes}
          onRollback={handleRollback}
        />
      )}
    </>
  );
}
