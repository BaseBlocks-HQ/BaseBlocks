"use client";

import {
  DashboardFormDialog,
  dashboardDialogFormErrorClassName,
  dashboardDialogPrimaryFieldLabelClassName,
  dashboardDialogPrimaryInlineInputClassName,
} from "@/core/dialogs";
import { filesClient } from "@/lib/files/client";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { EditSiteLogoField } from "./edit-site-logo-field";

interface EditSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: {
    _id: string;
    name: string;
    logoUrl?: string;
    logoAssetId?: string;
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
    logoAssetId: site.logoAssetId || "",
    isSubmitting: false,
    isUploadingLogo: false,
    error: "",
  });
  const t = useTranslations();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const createSiteAsset = useMutation(api.assets.mutations.createSiteAsset);
  const updateSite = useMutation(api.sites.mutations.update);

  // Failure modes:
  // - Site name is empty
  // - Uploaded file is not an image
  // - Uploaded file exceeds the size limit
  // - Asset creation or site update fails
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDialogState({
        name: site.name,
        logoUrl: site.logoUrl || "",
        logoPreview: site.logoUrl || "",
        logoAssetId: site.logoAssetId || "",
        isSubmitting: false,
        isUploadingLogo: false,
        error: "",
      });
    }

    onOpenChange(nextOpen);
  };

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setDialogState((current) => ({
        ...current,
        error: t("dialogs.editSite.invalidImageType"),
      }));
      resetFileInput();
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setDialogState((current) => ({
        ...current,
        error: t("dialogs.editSite.logoTooLarge"),
      }));
      resetFileInput();
      return;
    }

    setDialogState((current) => ({
      ...current,
      error: "",
      isUploadingLogo: true,
    }));

    let objectKey: string | null = null;

    try {
      const uploadResult = await filesClient.upload(file, {
        siteId: site._id,
        purpose: "siteAsset",
      });
      objectKey = uploadResult.objectKey;

      const { assetId, url } = await createSiteAsset({
        siteId: site._id as Id<"sites">,
        objectKey: uploadResult.objectKey,
        filename: file.name,
        contentType: uploadResult.contentType,
        size: uploadResult.size,
        checksum: uploadResult.checksum,
      });

      setDialogState((current) => ({
        ...current,
        logoUrl: url,
        logoPreview: url,
        logoAssetId: assetId,
        isUploadingLogo: false,
      }));
      resetFileInput();
    } catch (err) {
      if (objectKey) {
        await filesClient.cleanup({
          siteId: site._id,
          purpose: "siteAsset",
          objectKey,
        });
      }

      setDialogState((current) => ({
        ...current,
        error: err instanceof Error ? err.message : t("common.error"),
        isUploadingLogo: false,
      }));
      resetFileInput();
    }
  };

  const handleRemoveLogo = () => {
    setDialogState((current) => ({
      ...current,
      logoUrl: "",
      logoPreview: "",
      logoAssetId: "",
      error: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedName = dialogState.name.trim();

    if (!trimmedName) {
      setDialogState((current) => ({
        ...current,
        error: t("dialogs.editSite.nameRequired"),
      }));
      return;
    }

    setDialogState((current) => ({
      ...current,
      error: "",
      isSubmitting: true,
    }));

    const hadLogo = !!site.logoAssetId || !!site.logoUrl;
    const hasNewAsset = !!dialogState.logoAssetId;
    const logoCleared = hadLogo && !dialogState.logoUrl;

    try {
      await updateSite({
        siteId: site._id as Id<"sites">,
        name: trimmedName,
        ...(hasNewAsset && {
          logoAssetId: dialogState.logoAssetId as Id<"assets">,
        }),
        ...(logoCleared && { clearLogo: true }),
      });
      handleOpenChange(false);
    } catch (err) {
      setDialogState((current) => ({
        ...current,
        error: err instanceof Error ? err.message : t("common.error"),
        isSubmitting: false,
      }));
    }
  };

  return (
    <DashboardFormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t("dialogs.editSite.title")}
      onSubmit={handleSubmit}
      isSubmitting={dialogState.isSubmitting}
      submitLabel={t("common.save")}
      submittingLabel={t("dialogs.editSite.saving")}
      cancelLabel={t("common.cancel")}
      bodyClassName="px-5 pb-4"
      formClassName="space-y-4"
      footerClassName="pt-2"
    >
      <div className="space-y-3">
        <div>
          <Label
            htmlFor="editSiteName"
            className={dashboardDialogPrimaryFieldLabelClassName}
          >
            {t("sites.siteName")}
          </Label>
          <Input
            id="editSiteName"
            placeholder={t("dialogs.createSite.namePlaceholder")}
            value={dialogState.name}
            onChange={(e) =>
              setDialogState((current) => ({
                ...current,
                name: e.target.value,
                error: "",
              }))
            }
            aria-invalid={!!dialogState.error}
            className={dashboardDialogPrimaryInlineInputClassName}
          />
        </div>

        <EditSiteLogoField
          fileInputRef={fileInputRef}
          isUploading={dialogState.isUploadingLogo}
          logoPreview={dialogState.logoPreview}
          onLogoUpload={handleLogoUpload}
          onRemoveLogo={handleRemoveLogo}
        />
      </div>

      {dialogState.error ? (
        <p className={dashboardDialogFormErrorClassName}>{dialogState.error}</p>
      ) : null}
    </DashboardFormDialog>
  );
}
