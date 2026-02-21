"use client";

import { FormDialog } from "@/components/dialogs/form-dialog";
import { authClient } from "@/lib/auth/client";
import { entityStorageClient } from "@/lib/storage/client";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { useMutation } from "convex/react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

interface EditSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: {
    _id: string;
    name: string;
    logoUrl?: string;
  };
}

export function EditSiteDialog({
  open,
  onOpenChange,
  site,
}: EditSiteDialogProps) {
  const [name, setName] = useState(site.name);
  const [logoUrl, setLogoUrl] = useState(site.logoUrl || "");
  const [logoPreview, setLogoPreview] = useState(site.logoUrl || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [error, setError] = useState("");
  const t = useTranslations();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const updateSite = useMutation(api.sites.mutations.update);

  // Reset form when dialog opens with new site data
  useEffect(() => {
    if (open) {
      setName(site.name);
      setLogoUrl(site.logoUrl || "");
      setLogoPreview(site.logoUrl || "");
      setError("");
    }
  }, [open, site.name, site.logoUrl]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError(t("dialogs.editSite.invalidImageType"));
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError(t("dialogs.editSite.logoTooLarge"));
      return;
    }

    setError("");
    setIsUploadingLogo(true);

    try {
      if (!user?.id) {
        throw new Error("User not found");
      }

      // Generate a path for the logo
      const timestamp = Date.now();
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = `/logos/${site._id}/${timestamp}_${sanitizedFilename}`;

      // Upload to Entity Storage (proxy handles auth via session cookie)
      const { cdnUrl } = await entityStorageClient.upload(file, path);

      setLogoUrl(cdnUrl);
      setLogoPreview(cdnUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setIsUploadingLogo(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl("");
    setLogoPreview("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await updateSite({
        siteId: site._id as Id<"sites">,
        name,
        logoUrl: logoUrl || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("dialogs.editSite.title")}
      description={t("dialogs.editSite.description")}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel={t("common.save")}
      submittingLabel={t("dialogs.editSite.saving")}
    >
      <div className="space-y-2">
        <Label>{t("dialogs.editSite.logoLabel")}</Label>
        <div className="flex items-center gap-4">
          {logoPreview ? (
            <div className="relative">
              <img
                src={logoPreview}
                alt="Site logo"
                className="h-16 w-16 rounded-lg object-contain border bg-muted"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6"
                onClick={handleRemoveLogo}
                disabled={isUploadingLogo}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed bg-muted text-muted-foreground">
              <ImagePlus className="h-6 w-6" />
            </div>
          )}
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
              disabled={isUploadingLogo}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingLogo}
            >
              {isUploadingLogo ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("dialogs.editSite.uploading")}
                </>
              ) : (
                t("dialogs.editSite.uploadLogo")
              )}
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("dialogs.editSite.logoHint")}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="editSiteName">{t("sites.siteName")}</Label>
        <Input
          id="editSiteName"
          placeholder={t("dialogs.createSite.namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </FormDialog>
  );
}
