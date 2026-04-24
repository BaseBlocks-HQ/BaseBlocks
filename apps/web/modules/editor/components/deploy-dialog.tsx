"use client";

import { DashboardDialogShell } from "@/components/dialogs";
import { useHaptic } from "@/lib/use-haptic";
import { Button } from "@baseblocks/ui/button";
import { DialogFooter } from "@baseblocks/ui/dialog";
import { Label } from "@baseblocks/ui/label";
import { Textarea } from "@baseblocks/ui/textarea";
import { Rocket } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("editor.deploy");
  const tCommon = useTranslations("common");
  const [notes, setNotes] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const haptic = useHaptic();

  const handleDeploy = async () => {
    haptic.trigger("heavy");
    setIsDeploying(true);
    void onDeploy(notes.trim() || undefined)
      .then(() => {
        haptic.trigger("success");
        setNotes("");
        onOpenChange(false);
      })
      .finally(() => {
        setIsDeploying(false);
      });
  };

  return (
    <DashboardDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2">
          <Rocket className="h-5 w-5 shrink-0" />
          {t("title")}
        </span>
      }
      description={t("description")}
      contentClassName="sm:max-w-[32rem]"
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="deploy-notes">{t("notesLabel")}</Label>
          <Textarea
            id="deploy-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("notesPlaceholder")}
            rows={3}
            className="rounded-[0.95rem] border-sidebar-border/80 bg-background/70"
          />
        </div>
      </div>

      <DialogFooter className="pt-2">
        <Button
          type="button"
          variant="outline"
          disabled={isDeploying}
          onClick={() => onOpenChange(false)}
          className="h-8 rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm"
        >
          {tCommon("cancel")}
        </Button>
        <Button
          type="button"
          onClick={handleDeploy}
          disabled={isDeploying}
          className="h-8 rounded-full bg-amber-600 px-4 text-sm hover:bg-amber-700"
        >
          {isDeploying ? t("deploying") : t("deployNow")}
        </Button>
      </DialogFooter>
    </DashboardDialogShell>
  );
}
