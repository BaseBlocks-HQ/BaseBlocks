"use client";

import { DashboardDialogShell } from "@/components/dialogs";
import { Button } from "@baseblocks/ui/button";
import { DialogFooter } from "@baseblocks/ui/dialog";
import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("editor.rollback");
  const tCommon = useTranslations("common");
  const [isRollingBack, setIsRollingBack] = useState(false);

  const handleRollback = async () => {
    setIsRollingBack(true);
    try {
      await onRollback();
      onOpenChange(false);
      setIsRollingBack(false);
    } catch {
      setIsRollingBack(false);
    }
  };

  const description = (
    <>
      <span>{t("description", { version: targetVersion })}</span>
      {targetNotes ? (
        <span className="mt-1 block text-sidebar-foreground/80">
          {t("notesQuote", { notes: targetNotes })}
        </span>
      ) : null}
    </>
  );

  return (
    <DashboardDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5 shrink-0" />
          {t("title", { version: targetVersion })}
        </span>
      }
      description={description}
      contentClassName="sm:max-w-[32rem]"
    >
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 p-3 text-sm dark:border-amber-800/80 dark:bg-amber-950/40">
        <p className="font-medium text-amber-900 dark:text-amber-100">
          {t("warningTitle")}
        </p>
        <p className="mt-1 text-amber-800 dark:text-amber-200/90">
          {t("warningBody")}
        </p>
      </div>

      <DialogFooter className="pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isRollingBack}
          className="h-8 rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm"
        >
          {tCommon("cancel")}
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={handleRollback}
          disabled={isRollingBack}
          className="h-8 rounded-full px-4 text-sm"
        >
          {isRollingBack ? t("rollingBack") : t("rollback")}
        </Button>
      </DialogFooter>
    </DashboardDialogShell>
  );
}
