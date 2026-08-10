"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { getSiteUrl } from "@/features/published-sites/urls";
import {
  Copy01Icon,
  GlobeIcon,
  Tick01Icon,
  ViewIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons";
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
import { Spinner } from "@baseblocks/ui/spinner";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

type Visibility = "private" | "public";

interface ShareDialogProps {
  onOpenChange: (open: boolean) => void;
  returnFocusTo?: HTMLElement | null;
  siteId: Id<"sites">;
  teamSlug: string;
  siteSlug: string;
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
  onOpenChange,
  returnFocusTo,
  siteId,
  teamSlug,
  siteSlug,
}: ShareDialogProps) {
  const t = useTranslations("editor.share");
  const [copied, setCopied] = useState(false);
  const updateVisibilityMut = useMutation(api.sharing.updateVisibility);
  const settings = useQuery(api.sharing.getSettings, { siteId });
  const siteUrl = getSiteUrl(teamSlug, siteSlug);
  const visibility = settings?.visibility;

  const handleVisibilityChange = async (value: Visibility) => {
    try {
      await updateVisibilityMut({
        siteId,
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

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        className={`overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[46rem] [&_[data-slot='dialog-close']]:top-4 [&_[data-slot='dialog-close']]:right-4 sm:max-w-lg`}
        returnFocusTo={returnFocusTo}
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
            {visibility ? (
              <RadioGroup
                value={visibility}
                onValueChange={(value) =>
                  void handleVisibilityChange(value as Visibility)
                }
              >
                <VisibilityOptionCard
                  description={t("visibilityPublicDescription")}
                  icon={
                    <HugeiconsIcon
                      icon={GlobeIcon}
                      className="h-4 w-4 text-muted-foreground"
                    />
                  }
                  id="public"
                  label={t("visibilityPublicLabel")}
                  value="public"
                />
                <VisibilityOptionCard
                  description={t("visibilityPrivateDescription")}
                  icon={
                    <HugeiconsIcon
                      icon={ViewOffIcon}
                      className="h-4 w-4 text-muted-foreground"
                    />
                  }
                  id="private"
                  label={t("visibilityPrivateLabel")}
                  value="private"
                />
              </RadioGroup>
            ) : (
              <div className="flex min-h-32 items-center justify-center">
                <span className="sr-only">Loading sharing settings</span>
                <Spinner className="size-5 text-muted-foreground" />
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 pt-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="h-8 flex-1 rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm"
              disabled={!visibility}
              onClick={copyLink}
            >
              {copied ? (
                <>
                  <HugeiconsIcon icon={Tick01Icon} className="mr-2 h-4 w-4" />
                  {t("copied")}
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={Copy01Icon} className="mr-2 h-4 w-4" />
                  {t("copyLink")}
                </>
              )}
            </Button>
            <Button
              type="button"
              className="h-8 flex-1 rounded-full px-4 text-sm"
              disabled={!visibility}
              onClick={() => window.open(siteUrl, "_blank")}
            >
              <HugeiconsIcon icon={ViewIcon} className="mr-2 h-4 w-4" />
              {t("viewSite")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
