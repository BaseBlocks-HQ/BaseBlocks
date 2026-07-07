"use client";

import type {
  AccessCodeData,
  SharingSettings,
} from "@/modules/editor/app/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { useMutation } from "convex/react";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Globe,
  Link,
  Lock,
  RefreshCw,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Visibility = "private" | "public" | "link-only" | "password";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  teamSlug: string;
  siteSlug: string;
  siteUrl: string;
  settings?: SharingSettings;
  accessCode?: AccessCodeData | null;
}

function getCurrentTimestamp() {
  return Date.now();
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

function PasswordSettingsPanel({
  accessCode,
  codeCopied,
  getExpirationText,
  handleRegenerateCode,
  handleRotationChange,
  handleSessionChange,
  rotationHours,
  rotationOptions,
  sessionDays,
  sessionOptions,
  onCopyCode,
}: {
  accessCode?: AccessCodeData | null;
  codeCopied: boolean;
  getExpirationText: () => string | null;
  handleRegenerateCode: () => void;
  handleRotationChange: (value: string) => void;
  handleSessionChange: (value: string) => void;
  onCopyCode: () => void;
  rotationHours: string;
  rotationOptions: { value: string; label: string }[];
  sessionDays: string;
  sessionOptions: { value: string; label: string }[];
}) {
  const t = useTranslations("editor.share");
  return (
    <div className="space-y-4 rounded-xl border border-sidebar-border/60 bg-sidebar-accent/20 p-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t("accessCodeLabel")}</Label>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-[0.75rem] border border-sidebar-border/70 bg-background/80 p-3 text-center font-mono text-2xl tracking-[0.3em]">
            {accessCode?.code ?? t("codePlaceholder")}
          </code>
          <Button
            variant="outline"
            size="icon"
            onClick={onCopyCode}
            disabled={!accessCode?.code}
            className="h-10 w-10 shrink-0 rounded-full border-sidebar-border/70"
          >
            {codeCopied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRegenerateCode}
            className="h-10 w-10 shrink-0 rounded-full border-sidebar-border/70"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        {accessCode ? (
          <p
            className={`text-xs ${
              accessCode.isExpired
                ? "text-destructive"
                : "text-sidebar-foreground/55"
            }`}
          >
            {getExpirationText()}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm">{t("autoRotateLabel")}</Label>
          <Select value={rotationHours} onValueChange={handleRotationChange}>
            <SelectTrigger className="rounded-[0.95rem] border-sidebar-border/80 bg-background/70">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rotationOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">{t("sessionLastsLabel")}</Label>
          <Select value={sessionDays} onValueChange={handleSessionChange}>
            <SelectTrigger className="rounded-[0.95rem] border-sidebar-border/80 bg-background/70">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sessionOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
  accessCode,
}: ShareDialogProps) {
  const t = useTranslations("editor.share");
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const rotationOptions = useMemo(
    () => [
      { value: "1", label: t("rotation1h") },
      { value: "6", label: t("rotation6h") },
      { value: "24", label: t("rotation24h") },
      { value: "168", label: t("rotation7d") },
    ],
    [t],
  );

  const sessionOptions = useMemo(
    () => [
      { value: "1", label: t("session1d") },
      { value: "7", label: t("session7d") },
      { value: "30", label: t("session30d") },
    ],
    [t],
  );

  const updateVisibilityMut = useMutation(
    api.sharing.mutations.updateVisibility,
  );
  const updateAccessSettingsMut = useMutation(
    api.sharing.mutations.updateAccessSettings,
  );
  const generateNewCodeMut = useMutation(
    api.sharing.mutations.generateNewAccessCode,
  );

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

  const handleRotationChange = async (value: string) => {
    try {
      await updateAccessSettingsMut({
        siteId: siteId as Id<"sites">,
        accessCodeRotationHours: Number.parseInt(value, 10),
      });
      toast.success(t("toastRotationUpdated"));
    } catch {
      toast.error(t("toastRotationFailed"));
    }
  };

  const handleSessionChange = async (value: string) => {
    try {
      await updateAccessSettingsMut({
        siteId: siteId as Id<"sites">,
        accessCodeSessionDays: Number.parseInt(value, 10),
      });
      toast.success(t("toastSessionUpdated"));
    } catch {
      toast.error(t("toastSessionFailed"));
    }
  };

  const handleRegenerateCode = async () => {
    try {
      await generateNewCodeMut({ siteId: siteId as Id<"sites"> });
      toast.success(t("toastCodeRegenerated"));
    } catch {
      toast.error(t("toastCodeRegenerateFailed"));
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(siteUrl);
    setCopied(true);
    toast.success(t("toastLinkCopied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = () => {
    if (accessCode?.code) {
      navigator.clipboard.writeText(accessCode.code);
      setCodeCopied(true);
      toast.success(t("toastCodeCopied"));
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setNow(getCurrentTimestamp());
    }
    if (!newOpen) {
      setCopied(false);
      setCodeCopied(false);
    }
    onOpenChange(newOpen);
  };

  const [now, setNow] = useState(getCurrentTimestamp);

  useEffect(() => {
    if (!open || !accessCode?.expiresAt || accessCode.isExpired) return;
    const id = setInterval(() => setNow(getCurrentTimestamp()), 60_000);
    return () => clearInterval(id);
  }, [open, accessCode?.expiresAt, accessCode?.isExpired]);

  const getExpirationText = () => {
    if (!accessCode?.expiresAt) return null;
    if (accessCode.isExpired) return t("expired");

    const diff = accessCode.expiresAt - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return t("expiresInDays", { count: days });
    }
    if (hours > 0) {
      return t("expiresInHoursMinutes", { hours, minutes });
    }
    return t("expiresInMinutes", { minutes });
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
                description={t("visibilityLinkOnlyDescription")}
                icon={<Link className="h-4 w-4 text-muted-foreground" />}
                id="link-only"
                label={t("visibilityLinkOnlyLabel")}
                value="link-only"
              />
              <VisibilityOptionCard
                description={t("visibilityPasswordDescription")}
                icon={<Lock className="h-4 w-4 text-muted-foreground" />}
                id="password"
                label={t("visibilityPasswordLabel")}
                value="password"
              />
              <VisibilityOptionCard
                description={t("visibilityPrivateDescription")}
                icon={<EyeOff className="h-4 w-4 text-muted-foreground" />}
                id="private"
                label={t("visibilityPrivateLabel")}
                value="private"
              />
            </RadioGroup>

            {visibility === "password" ? (
              <PasswordSettingsPanel
                accessCode={accessCode}
                codeCopied={codeCopied}
                getExpirationText={getExpirationText}
                handleRegenerateCode={handleRegenerateCode}
                handleRotationChange={handleRotationChange}
                handleSessionChange={handleSessionChange}
                onCopyCode={copyCode}
                rotationHours={String(settings?.accessCodeRotationHours ?? 24)}
                rotationOptions={rotationOptions}
                sessionDays={String(settings?.accessCodeSessionDays ?? 7)}
                sessionOptions={sessionOptions}
              />
            ) : null}
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
