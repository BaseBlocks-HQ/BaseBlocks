"use client";

import { filesClient } from "@/lib/files/upload";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
import { useMutation } from "convex/react";
import { ImagePlus, Info, Trash2 } from "lucide-react";
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
    logoFileId?: string;
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
    logoFileId: site.logoFileId || "",
    isSubmitting: false,
    isUploadingLogo: false,
    error: "",
  });
  const t = useTranslations();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const createSiteAsset = useMutation(api.files.createSiteAsset);
  const updateSite = useMutation(api.sites.update);

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
        logoFileId: site.logoFileId || "",
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

      const { fileId, url } = await createSiteAsset({
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
        logoFileId: fileId,
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
      logoFileId: "",
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

    const hadLogo = !!site.logoFileId || !!site.logoUrl;
    const hasNewAsset = !!dialogState.logoFileId;
    const logoCleared = hadLogo && !dialogState.logoUrl;

    try {
      await updateSite({
        siteId: site._id as Id<"sites">,
        name: trimmedName,
        ...(hasNewAsset && {
          logoFileId: dialogState.logoFileId as Id<"files">,
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

function EditSiteLogoField({
  fileInputRef,
  isUploading,
  logoPreview,
  onLogoUpload,
  onRemoveLogo,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isUploading: boolean;
  logoPreview: string;
  onLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
}) {
  const t = useTranslations();

  return (
    <div className="rounded-[1.1rem] border border-sidebar-border/80 bg-background/55 p-3 shadow-[inset_0_1px_0_hsl(var(--background)/0.4)]">
      <div className="mb-3 flex items-center gap-1.5">
        <Label className="text-xs font-medium tracking-wide text-sidebar-foreground/55">
          {t("dialogs.editSite.logoLabel")}
        </Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-sidebar-foreground/40 transition-colors hover:text-sidebar-foreground/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
            >
              <Info className="h-3 w-3" />
              <span className="sr-only">{t("dialogs.editSite.logoHint")}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            sideOffset={6}
            className="max-w-[220px] bg-sidebar text-sidebar-foreground shadow-lg"
            arrowClassName="bg-sidebar fill-sidebar"
          >
            {t("dialogs.editSite.logoHint")}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-center gap-4">
        {logoPreview ? (
          <div className="relative shrink-0 rounded-[1rem] bg-muted/45 p-0.5 shadow-[inset_0_1px_0_hsl(var(--background)/0.45)] ring-1 ring-border/60">
            <Image
              src={logoPreview}
              alt="Site logo"
              className="h-16 w-16 rounded-[0.85rem] border border-border/55 bg-background object-contain"
              width={64}
              height={64}
              unoptimized
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-1.5 -right-1.5 h-7 w-7 rounded-full shadow-sm"
              onClick={onRemoveLogo}
              disabled={isUploading}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1rem] border border-dashed border-sidebar-border/80 bg-background/70 text-sidebar-foreground/45">
            <ImagePlus className="h-6 w-6" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onLogoUpload}
            className="hidden"
            disabled={isUploading}
          />
          <p className="text-sm font-medium text-sidebar-foreground">
            {logoPreview
              ? t("dialogs.editSite.logoSelected")
              : t("dialogs.editSite.logoEmpty")}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-auto rounded-none px-0 py-0 text-sm font-medium text-sidebar-foreground/70 hover:bg-transparent hover:text-sidebar-foreground"
            >
              {t("dialogs.editSite.uploadLogo")}
            </Button>
            {isUploading ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-sidebar-foreground/50">
                <span className="h-1.5 w-1.5 rounded-full bg-sidebar-foreground/35" />
                {t("dialogs.editSite.uploading")}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
