"use client";

/**
 * Deployment history lives in the site editor only (not the team dashboard).
 * Opened from the editor header ⋯ menu → “Deployment history” when the site is published.
 * Renders as a Sheet from the right; rollback uses `RollbackDialog` (dashboard shell).
 */
import type { DeploymentData } from "@/modules/editor/app/types";
import { Badge } from "@baseblocks/ui/badge";
import { Button } from "@baseblocks/ui/button";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@baseblocks/ui/sheet";
import { History, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { RollbackDialog } from "./rollback-dialog";

interface DeploymentHistoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  deployments?: DeploymentData[];
  onRollback: (targetDeploymentId: string) => Promise<void>;
}

export function DeploymentHistoryPanel({
  open,
  onOpenChange,
  deployments,
  onRollback,
}: DeploymentHistoryPanelProps) {
  const t = useTranslations("editor.deploymentHistory");
  const loadingItems = ["pending-a", "pending-b", "pending-c"];
  const [rollbackTarget, setRollbackTarget] = useState<{
    id: string;
    version: number;
    notes?: string;
  } | null>(null);

  const handleRollback = async () => {
    if (!rollbackTarget) return;
    try {
      await onRollback(rollbackTarget.id);
      toast.success(t("toastSuccess", { version: rollbackTarget.version }));
      setRollbackTarget(null);
    } catch (_error) {
      toast.error(t("toastFailed"));
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("relativeJustNow");
    if (diffMins < 60) return t("relativeMinutes", { count: diffMins });
    if (diffHours < 24) return t("relativeHours", { count: diffHours });
    if (diffDays < 7) return t("relativeDays", { count: diffDays });
    return date.toLocaleDateString();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-600 text-xs hover:bg-green-700">
            {t("statusActive")}
          </Badge>
        );
      case "superseded":
        return (
          <Badge variant="secondary" className="text-xs">
            {t("statusSuperseded")}
          </Badge>
        );
      case "rolled-back":
        return (
          <Badge
            variant="outline"
            className="border-amber-300 text-xs text-amber-600"
          >
            {t("statusRolledBack")}
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full border-l border-sidebar-border bg-sidebar text-sidebar-foreground sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-base font-semibold">
              <History className="h-5 w-5" />
              {t("title")}
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="mt-4 h-[calc(100vh-8rem)]">
            <div className="px-4 pb-6">
              {deployments === undefined ? (
                <div className="space-y-3">
                  {loadingItems.map((item) => (
                    <div
                      key={item}
                      className="h-20 animate-pulse rounded-xl bg-sidebar-accent/40"
                    />
                  ))}
                </div>
              ) : deployments.length === 0 ? (
                <div className="py-12 text-center text-sidebar-foreground/60">
                  <History className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>{t("empty")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {deployments.map((deployment) => (
                    <div
                      key={deployment.id}
                      className="space-y-2 rounded-xl border border-sidebar-border/70 bg-background/50 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          v{deployment.version}
                        </span>
                        {statusBadge(deployment.status)}
                      </div>

                      {deployment.notes ? (
                        <p className="line-clamp-2 text-sm text-sidebar-foreground/60">
                          {deployment.notes}
                        </p>
                      ) : null}

                      <div className="flex items-center justify-between text-xs text-sidebar-foreground/55">
                        <span>
                          {t("pagesLayouts", {
                            pages: deployment.summary.pagesDeployed,
                            layouts: deployment.summary.layoutsDeployed,
                          })}
                        </span>
                        <span>{formatDate(deployment.deployedAt)}</span>
                      </div>

                      {deployment.status !== "active" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-full gap-1.5 rounded-full text-xs"
                          onClick={() =>
                            setRollbackTarget({
                              id: deployment.id,
                              version: deployment.version,
                              notes: deployment.notes,
                            })
                          }
                        >
                          <RotateCcw className="h-3 w-3" />
                          {t("rollbackCta")}
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {rollbackTarget ? (
        <RollbackDialog
          open={!!rollbackTarget}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setRollbackTarget(null);
          }}
          targetVersion={rollbackTarget.version}
          targetNotes={rollbackTarget.notes}
          onRollback={handleRollback}
        />
      ) : null}
    </>
  );
}
