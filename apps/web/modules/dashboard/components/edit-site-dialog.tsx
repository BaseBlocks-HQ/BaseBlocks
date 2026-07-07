"use client";

import { filesClient } from "@/lib/files/client";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@baseblocks/ui/dialog";
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={
          "overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[46rem] [&_[data-slot='dialog-close']]:top-4 [&_[data-slot='dialog-close']]:right-4"
        }
      >
        <DialogHeader className={"px-5 pt-4 pb-0"}>
          <DialogTitle className={"text-base font-semibold"}>
            {t("dialogs.editSite.title")}
          </DialogTitle>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit}
          className={`px-5 pb-3 space-y-4 pb-4`}
        >
          <div className="space-y-3">
            <div>
              <Label
                htmlFor="editSiteName"
                className={
                  "mb-0.5 block text-xs font-medium tracking-wide text-sidebar-foreground/55"
                }
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
                className={
                  "h-auto border-0 bg-transparent px-0 py-0.5 text-[1.4rem] font-semibold leading-tight tracking-tight text-sidebar-foreground shadow-none placeholder:text-sidebar-foreground/40 focus-visible:ring-0 md:!text-[1.4rem] dark:bg-transparent"
                }
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
            <p
              className={
                "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              }
            >
              {dialogState.error}
            </p>
          ) : null}
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={dialogState.isSubmitting}
              className={
                "h-8 rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm"
              }
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={dialogState.isSubmitting}
              className={"h-8 rounded-full px-4 text-sm"}
            >
              {dialogState.isSubmitting
                ? t("dialogs.editSite.saving")
                : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
