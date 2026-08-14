"use client";

import { getSiteUrl } from "@/features/published-sites/urls";
import { api, type Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@baseblocks/ui/dialog";
import { cn } from "@baseblocks/ui/lib/utils";
import { RadioGroup, RadioGroupItem } from "@baseblocks/ui/radio-group";
import { Spinner } from "@baseblocks/ui/spinner";
import {
  Copy01Icon,
  GlobeIcon,
  Tick01Icon,
  ViewIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";

type Visibility = "private" | "public";

interface ShareDialogProps {
  onOpenChange: (open: boolean) => void;
  returnFocusTo?: HTMLElement | null;
  siteId: Id<"sites">;
  siteSlug: string;
  teamSlug: string;
}

function VisibilityOption({
  active,
  description,
  icon,
  label,
  value,
}: {
  active: boolean;
  description: string;
  icon: React.ReactNode;
  label: string;
  value: Visibility;
}) {
  const id = `site-visibility-${value}`;

  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl p-3 outline-none transition-colors",
        "hover:bg-muted/70 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50",
        active ? "bg-muted" : "bg-muted/35",
      )}
      htmlFor={id}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-xs">
        {icon}
      </span>
      <span className="min-w-0 flex-1 pt-0.5">
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
      <RadioGroupItem className="mt-2" id={id} value={value} />
    </label>
  );
}

export function ShareDialog({
  onOpenChange,
  returnFocusTo,
  siteId,
  siteSlug,
  teamSlug,
}: ShareDialogProps) {
  const t = useTranslations("editor.share");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState(false);
  const [updating, setUpdating] = useState(false);
  const updateVisibility = useMutation(api.sharing.updateVisibility);
  const settings = useQuery(api.sharing.getSettings, { siteId });
  const siteUrl = getSiteUrl(teamSlug, siteSlug);
  const visibility = settings?.visibility;

  const handleVisibilityChange = async (value: string) => {
    if (value === visibility || updating) return;
    setUpdating(true);
    try {
      await updateVisibility({
        siteId,
        visibility: value as Visibility,
      });
      toast.success(t("toastVisibilityUpdated"));
    } catch {
      toast.error(t("toastVisibilityFailed"));
    } finally {
      setUpdating(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(siteUrl);
    setCopied(true);
    toast.success(t("toastLinkCopied"));
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100%-1.5rem)] max-w-[28rem] gap-0 overflow-hidden rounded-2xl border-0 bg-background/80 p-0 text-foreground shadow-2xl backdrop-blur-xl backdrop-saturate-150 sm:max-w-[28rem] [&_[data-slot='dialog-close']]:top-2 [&_[data-slot='dialog-close']]:right-2 [&_[data-slot='dialog-close']]:flex [&_[data-slot='dialog-close']]:size-8 [&_[data-slot='dialog-close']]:items-center [&_[data-slot='dialog-close']]:justify-center [&_[data-slot='dialog-close']]:rounded-lg"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          titleRef.current?.focus();
        }}
        returnFocusTo={returnFocusTo}
      >
        <DialogHeader className="px-4 pt-4 pe-12">
          <DialogTitle
            className="brand-display text-2xl leading-none font-normal tracking-[-0.025em]"
            ref={titleRef}
            tabIndex={-1}
          >
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pt-4">
          {visibility ? (
            <RadioGroup
              aria-label={t("visibilityLabel")}
              className="grid gap-2"
              disabled={updating}
              onValueChange={(value) => void handleVisibilityChange(value)}
              value={visibility}
            >
              <VisibilityOption
                active={visibility === "public"}
                description={t("visibilityPublicDescription")}
                icon={<HugeiconsIcon aria-hidden icon={GlobeIcon} />}
                label={t("visibilityPublicLabel")}
                value="public"
              />
              <VisibilityOption
                active={visibility === "private"}
                description={t("visibilityPrivateDescription")}
                icon={<HugeiconsIcon aria-hidden icon={ViewOffIcon} />}
                label={t("visibilityPrivateLabel")}
                value="private"
              />
            </RadioGroup>
          ) : (
            <div className="flex min-h-36 items-center justify-center">
              <Spinner className="size-5 text-muted-foreground" />
              <span className="sr-only">{t("loading")}</span>
            </div>
          )}
        </div>

        <DialogFooter className="grid grid-cols-2 gap-2 px-4 pt-4 pb-4 sm:grid-cols-2">
          <Button
            disabled={!visibility}
            onClick={() => void copyLink()}
            size="sm"
            type="button"
            variant="outline"
          >
            <HugeiconsIcon
              aria-hidden
              icon={copied ? Tick01Icon : Copy01Icon}
            />
            {copied ? t("copied") : t("copyLink")}
          </Button>
          <Button
            disabled={!visibility}
            onClick={() => window.open(siteUrl, "_blank")}
            size="sm"
            type="button"
          >
            <HugeiconsIcon aria-hidden icon={ViewIcon} />
            {t("viewSite")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
