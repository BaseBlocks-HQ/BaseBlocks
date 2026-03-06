"use client";

import { FormDialog } from "@/components/dialogs/form-dialog";
import { authClient } from "@/lib/auth/client";
import { entityStorageClient, toProxyDownloadUrl } from "@/lib/storage/client";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { useMutation } from "convex/react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRef, useState } from "react";

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
  const [dialogState, setDialogState] = useState({
    name: site.name,
    logoUrl: site.logoUrl || "",
    logoPreview: site.logoUrl || "",
    isSubmitting: false,
    isUploadingLogo: false,
    error: "",
  });
  const t = useTranslations();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const updateSite = useMutation(api.sites.mutations.update);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setDialogState({
        name: site.name,
        logoUrl: site.logoUrl || "",
        logoPreview: site.logoUrl || "",
        isSubmitting: false,
        isUploadingLogo: false,
        error: "",
      });
    }
    onOpenChange(newOpen);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setDialogState((current) => ({
        ...current,
        error: t("dialogs.editSite.invalidImageType"),
      }));
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setDialogState((current) => ({
        ...current,
        error: t("dialogs.editSite.logoTooLarge"),
      }));
      return;
    }

    setDialogState((current) => ({
      ...current,
      error: "",
      isUploadingLogo: true,
    }));
    const userId = user?.id;
    if (!userId) {
      setDialogState((current) => ({
        ...current,
        error: "User not found",
        isUploadingLogo: false,
      }));
      return;
    }
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const path = `/logos/${site._id}/${timestamp}_${sanitizedFilename}`;

    try {
      // Upload to Entity Storage (proxy handles auth via session cookie)
      const { cdnUrl } = await entityStorageClient.upload(file, path);

      setDialogState((current) => ({
        ...current,
        logoUrl: cdnUrl,
        logoPreview: cdnUrl,
        isUploadingLogo: false,
      }));
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setDialogState((current) => ({
        ...current,
        error: err instanceof Error ? err.message : t("common.error"),
        isUploadingLogo: false,
      }));
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = () => {
    setDialogState((current) => ({
      ...current,
      logoUrl: "",
      logoPreview: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDialogState((current) => ({
      ...current,
      error: "",
      isSubmitting: true,
    }));
    const nextLogoUrl = dialogState.logoUrl ? dialogState.logoUrl : undefined;

    try {
      await updateSite({
        siteId: site._id as Id<"sites">,
        name: dialogState.name,
        logoUrl: nextLogoUrl,
      });
      onOpenChange(false);
      setDialogState((current) => ({
        ...current,
        isSubmitting: false,
      }));
    } catch (err) {
      setDialogState((current) => ({
        ...current,
        error: err instanceof Error ? err.message : t("common.error"),
        isSubmitting: false,
      }));
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t("dialogs.editSite.title")}
      description={t("dialogs.editSite.description")}
      onSubmit={handleSubmit}
      isSubmitting={dialogState.isSubmitting}
      submitLabel={t("common.save")}
      submittingLabel={t("dialogs.editSite.saving")}
    >
      <div className="space-y-2">
        <Label>{t("dialogs.editSite.logoLabel")}</Label>
        <div className="flex items-center gap-4">
          {dialogState.logoPreview ? (
            <div className="relative">
              <Image
                src={toProxyDownloadUrl(dialogState.logoPreview)}
                alt="Site logo"
                className="h-16 w-16 rounded-lg object-contain border bg-muted"
                width={64}
                height={64}
                unoptimized
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6"
                onClick={handleRemoveLogo}
                disabled={dialogState.isUploadingLogo}
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
              disabled={dialogState.isUploadingLogo}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={dialogState.isUploadingLogo}
            >
              {dialogState.isUploadingLogo ? (
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
          value={dialogState.name}
          onChange={(e) =>
            setDialogState((current) => ({
              ...current,
              name: e.target.value,
            }))
          }
          required
        />
      </div>

      {dialogState.error && (
        <p className="text-sm text-destructive">{dialogState.error}</p>
      )}
    </FormDialog>
  );
}
