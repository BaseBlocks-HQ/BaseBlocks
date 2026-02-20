"use client";

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
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useEditorMutations } from "../contexts/editor-mutations";
import type { AccessCodeData, SharingSettings } from "../types";

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

  const { sharing } = useEditorMutations();

  const visibility = settings?.visibility ?? "public";

  const handleVisibilityChange = useCallback(
    async (value: Visibility) => {
      try {
        await sharing.updateVisibility({ siteId, visibility: value });
        toast.success("Visibility updated");
      } catch {
        toast.error("Failed to update visibility");
      }
    },
    [siteId, sharing],
  );

  const handleRotationChange = useCallback(
    async (value: string) => {
      try {
        await sharing.updateAccessSettings({
          siteId,
          accessCodeRotationHours: Number.parseInt(value),
        });
        toast.success("Rotation interval updated");
      } catch {
        toast.error("Failed to update rotation interval");
      }
    },
    [siteId, sharing],
  );

  const handleSessionChange = useCallback(
    async (value: string) => {
      try {
        await sharing.updateAccessSettings({
          siteId,
          accessCodeSessionDays: Number.parseInt(value),
        });
        toast.success("Session duration updated");
      } catch {
        toast.error("Failed to update session duration");
      }
    },
    [siteId, sharing],
  );

  const handleRegenerateCode = useCallback(async () => {
    try {
      await sharing.generateNewAccessCode({ siteId });
      toast.success("Access code regenerated");
    } catch {
      toast.error("Failed to regenerate access code");
    }
  }, [siteId, sharing]);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(siteUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, [siteUrl]);

  const copyCode = useCallback(() => {
    if (accessCode?.code) {
      navigator.clipboard.writeText(accessCode.code);
      setCodeCopied(true);
      toast.success("Access code copied to clipboard");
      setTimeout(() => setCodeCopied(false), 2000);
    }
  }, [accessCode?.code]);

  // Reset copied states when dialog closes
  useEffect(() => {
    if (!open) {
      setCopied(false);
      setCodeCopied(false);
    }
  }, [open]);

  // Calculate time until expiration
  const getExpirationText = () => {
    if (!accessCode?.expiresAt) return null;
    if (accessCode.isExpired) return "Expired";

    const now = Date.now();
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Settings</DialogTitle>
          <DialogDescription>
            Control who can view your published site.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Visibility Options */}
          <RadioGroup
            value={visibility}
            onValueChange={(v) => handleVisibilityChange(v as Visibility)}
          >
            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="public" id="public" className="mt-0.5" />
              <div className="flex-1">
                <Label
                  htmlFor="public"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  Public
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Anyone can view this site
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <RadioGroupItem
                value="link-only"
                id="link-only"
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label
                  htmlFor="link-only"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Link className="h-4 w-4 text-muted-foreground" />
                  Unlisted
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Only people with the link can view
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <RadioGroupItem
                value="password"
                id="password"
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label
                  htmlFor="password"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Password Protected
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Requires an access code to view
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="private" id="private" className="mt-0.5" />
              <div className="flex-1">
                <Label
                  htmlFor="private"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                  Private
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Only team members can view
                </p>
              </div>
            </div>
          </RadioGroup>

          {/* Password Settings */}
          {visibility === "password" && (
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
                    onClick={copyCode}
                    disabled={!accessCode?.code}
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
                  >
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
                  <Select
                    value={String(settings?.accessCodeRotationHours ?? 24)}
                    onValueChange={handleRotationChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROTATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Session lasts</Label>
                  <Select
                    value={String(settings?.accessCodeSessionDays ?? 7)}
                    onValueChange={handleSessionChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SESSION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
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
