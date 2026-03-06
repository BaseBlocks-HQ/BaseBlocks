"use client";

import type { AccessCodeData, SharingSettings } from "@/modules/shared/types";
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
import { useEffect, useState } from "react";
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

const ROTATION_OPTIONS = [
  { value: "1", label: "1 hour" },
  { value: "6", label: "6 hours" },
  { value: "24", label: "24 hours" },
  { value: "168", label: "7 days" },
];

const SESSION_OPTIONS = [
  { value: "1", label: "1 day" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
];

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
    <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
      <RadioGroupItem value={value} id={id} className="mt-0.5" />
      <div className="flex-1">
        <Label htmlFor={id} className="flex items-center gap-2 cursor-pointer">
          {icon}
          {label}
        </Label>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
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
  sessionDays,
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
  sessionDays: string;
}) {
  return (
    <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Access Code</Label>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-center text-2xl font-mono tracking-[0.3em] bg-background p-3 rounded border">
            {accessCode?.code ?? "------"}
          </code>
          <Button
            variant="outline"
            size="icon"
            onClick={onCopyCode}
            disabled={!accessCode?.code}
          >
            {codeCopied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={handleRegenerateCode}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        {accessCode && (
          <p
            className={`text-xs ${
              accessCode.isExpired
                ? "text-destructive"
                : "text-muted-foreground"
            }`}
          >
            {getExpirationText()}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm">Auto-rotate every</Label>
          <Select value={rotationHours} onValueChange={handleRotationChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROTATION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Session lasts</Label>
          <Select value={sessionDays} onValueChange={handleSessionChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SESSION_OPTIONS.map((option) => (
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
  siteUrl,
  settings,
  accessCode,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

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
      toast.success("Visibility updated");
    } catch {
      toast.error("Failed to update visibility");
    }
  };

  const handleRotationChange = async (value: string) => {
    try {
      await updateAccessSettingsMut({
        siteId: siteId as Id<"sites">,
        accessCodeRotationHours: Number.parseInt(value),
      });
      toast.success("Rotation interval updated");
    } catch {
      toast.error("Failed to update rotation interval");
    }
  };

  const handleSessionChange = async (value: string) => {
    try {
      await updateAccessSettingsMut({
        siteId: siteId as Id<"sites">,
        accessCodeSessionDays: Number.parseInt(value),
      });
      toast.success("Session duration updated");
    } catch {
      toast.error("Failed to update session duration");
    }
  };

  const handleRegenerateCode = async () => {
    try {
      await generateNewCodeMut({ siteId: siteId as Id<"sites"> });
      toast.success("Access code regenerated");
    } catch {
      toast.error("Failed to regenerate access code");
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(siteUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = () => {
    if (accessCode?.code) {
      navigator.clipboard.writeText(accessCode.code);
      setCodeCopied(true);
      toast.success("Access code copied to clipboard");
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

  // Track current time outside render to avoid Date.now() in render phase
  const [now, setNow] = useState(getCurrentTimestamp);

  useEffect(() => {
    if (!open || !accessCode?.expiresAt || accessCode.isExpired) return;
    const id = setInterval(() => setNow(getCurrentTimestamp()), 60_000);
    return () => clearInterval(id);
  }, [open, accessCode?.expiresAt, accessCode?.isExpired]);

  // Calculate time until expiration
  const getExpirationText = () => {
    if (!accessCode?.expiresAt) return null;
    if (accessCode.isExpired) return "Expired";

    const diff = accessCode.expiresAt - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `Expires in ${days} day${days > 1 ? "s" : ""}`;
    }
    if (hours > 0) {
      return `Expires in ${hours}h ${minutes}m`;
    }
    return `Expires in ${minutes} minutes`;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Settings</DialogTitle>
          <DialogDescription>
            Control who can view your published site.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RadioGroup
            value={visibility}
            onValueChange={(v) => handleVisibilityChange(v as Visibility)}
          >
            <VisibilityOptionCard
              description="Anyone can view this site"
              icon={<Globe className="h-4 w-4 text-muted-foreground" />}
              id="public"
              label="Public"
              value="public"
            />
            <VisibilityOptionCard
              description="Only people with the link can view"
              icon={<Link className="h-4 w-4 text-muted-foreground" />}
              id="link-only"
              label="Unlisted"
              value="link-only"
            />
            <VisibilityOptionCard
              description="Requires an access code to view"
              icon={<Lock className="h-4 w-4 text-muted-foreground" />}
              id="password"
              label="Password Protected"
              value="password"
            />
            <VisibilityOptionCard
              description="Only team members can view"
              icon={<EyeOff className="h-4 w-4 text-muted-foreground" />}
              id="private"
              label="Private"
              value="private"
            />
          </RadioGroup>

          {visibility === "password" && (
            <PasswordSettingsPanel
              accessCode={accessCode}
              codeCopied={codeCopied}
              getExpirationText={getExpirationText}
              handleRegenerateCode={handleRegenerateCode}
              handleRotationChange={handleRotationChange}
              handleSessionChange={handleSessionChange}
              onCopyCode={copyCode}
              rotationHours={String(settings?.accessCodeRotationHours ?? 24)}
              sessionDays={String(settings?.accessCodeSessionDays ?? 7)}
            />
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" className="flex-1" onClick={copyLink}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </>
            )}
          </Button>
          <Button
            className="flex-1"
            onClick={() => window.open(siteUrl, "_blank")}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Site
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
