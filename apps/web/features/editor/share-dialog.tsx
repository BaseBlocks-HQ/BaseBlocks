"use client";

import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@baseblocks/ui/dialog";
import { Label } from "@baseblocks/ui/label";
import { RadioGroup, RadioGroupItem } from "@baseblocks/ui/radio-group";
import { useMutation } from "convex/react";
import { Check, Copy, Eye, EyeOff, Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

type Visibility = "private" | "public";

export interface SharingSettings {
  visibility: string;
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  teamSlug: string;
  siteSlug: string;
  siteUrl: string;
  settings?: SharingSettings;
}

function VisibilityOptionCard({
  description,
  icon,
  id,
  label,
  value,
}: {
  description: string;
  icon: React.ReactNode;
  id: string;
  label: string;
  value: Visibility;
}) {
  return (
    <div className="flex items-start space-x-3 rounded-xl border border-sidebar-border/60 bg-background/40 p-3 transition-colors hover:bg-sidebar-accent/30">
      <RadioGroupItem value={value} id={id} className="mt-0.5" />
      <div className="flex-1">
        <Label htmlFor={id} className="flex cursor-pointer items-center gap-2">
          {icon}
          {label}
        </Label>
        <p className="mt-1 text-sm text-sidebar-foreground/60">{description}</p>
      </div>
    </div>
  );
}

export function ShareDialog({
  open,
  onOpenChange,
  siteId,
  teamSlug: _teamSlug,
  siteSlug: _siteSlug,
  siteUrl,
  settings,
}: ShareDialogProps) {
  const t = useTranslations("editor.share");
  const [copied, setCopied] = useState(false);

  const updateVisibilityMut = useMutation(api.sharing.updateVisibility);

  const visibility = settings?.visibility ?? "public";

  const handleVisibilityChange = async (value: Visibility) => {
    try {
      await updateVisibilityMut({
        siteId: siteId as Id<"sites">,
        visibility: value,
      });
      toast.success(t("toastVisibilityUpdated"));
    } catch {
      toast.error(t("toastVisibilityFailed"));
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(siteUrl);
    setCopied(true);
    toast.success(t("toastLinkCopied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCopied(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={`overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[46rem] [&_[data-slot='dialog-close']]:top-4 [&_[data-slot='dialog-close']]:right-4 sm:max-w-lg`}
      >
        <DialogHeader className={"px-5 pt-4 pb-0"}>
          <DialogTitle className={"text-base font-semibold"}>
            {t("title")}
          </DialogTitle>
          <DialogDescription className={"text-sm text-sidebar-foreground/60"}>
            {t("description")}
          </DialogDescription>
        </DialogHeader>
        <div className={"px-5 pb-3"}>
          <div className="space-y-6 py-1">
            <RadioGroup
              value={visibility}
              onValueChange={(v) =>
                void handleVisibilityChange(v as Visibility)
              }
            >
              <VisibilityOptionCard
                description={t("visibilityPublicDescription")}
                icon={<Globe className="h-4 w-4 text-muted-foreground" />}
                id="public"
                label={t("visibilityPublicLabel")}
                value="public"
              />
              <VisibilityOptionCard
                description={t("visibilityPrivateDescription")}
                icon={<EyeOff className="h-4 w-4 text-muted-foreground" />}
                id="private"
                label={t("visibilityPrivateLabel")}
                value="private"
              />
            </RadioGroup>
          </div>

          <DialogFooter className="flex-col gap-2 pt-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="h-8 flex-1 rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm"
              onClick={copyLink}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t("copied")}
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  {t("copyLink")}
                </>
              )}
            </Button>
            <Button
              type="button"
              className="h-8 flex-1 rounded-full px-4 text-sm"
              onClick={() => window.open(siteUrl, "_blank")}
            >
              <Eye className="mr-2 h-4 w-4" />
              {t("viewSite")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
