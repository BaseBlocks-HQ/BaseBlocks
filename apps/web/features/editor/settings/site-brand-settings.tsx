"use client";

import { useImageUpload } from "@/lib/files/use-image-upload";
import { api } from "@baseblocks/backend";
import type { Doc } from "@baseblocks/backend";
import { managedFilePath } from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { Spinner } from "@baseblocks/ui/spinner";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FaviconSettings } from "./favicon-settings";
import { ImageAssetDropZone } from "./image-asset-dropzone";
import { SiteSettingsSectionTitle } from "./site-settings-section-title";

export function SiteBrandSettings({ site }: { site: Doc<"sites"> }) {
  const siteId = site._id;
  const updateSite = useMutation(api.sites.update);
  const { uploadImage, uploadState } = useImageUpload();
  const [name, setName] = useState(site.name);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const [isRemovingLogo, setIsRemovingLogo] = useState(false);

  useEffect(() => setName(site.name), [site.name]);

  const saveName = async () => {
    const normalizedName = name.trim();
    if (!normalizedName || normalizedName === site.name || isSavingName) return;
    setIsSavingName(true);
    try {
      await updateSite({ siteId, name: normalizedName });
      setName(normalizedName);
      toast.success("Site name updated");
    } catch {
      toast.error("Unable to update the site name. Try again.");
    } finally {
      setIsSavingName(false);
    }
  };

  const uploadLogo = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Select an image smaller than 5 MB.");
      return;
    }
    if (isSavingLogo) return;
    setIsSavingLogo(true);
    try {
      const result = await uploadImage(file, siteId);
      if (!result) throw new Error("Upload failed");
      await updateSite({ siteId, logoFileId: result.fileId });
      toast.success("Logo uploaded");
    } catch {
      toast.error(uploadState.error ?? "Unable to save the logo. Try again.");
    } finally {
      setIsSavingLogo(false);
    }
  };

  const removeLogo = async () => {
    if (isRemovingLogo) return;
    setIsRemovingLogo(true);
    try {
      await updateSite({ siteId, clearLogo: true });
      toast.success("Logo removed");
    } catch {
      toast.error("Unable to remove the logo. Try again.");
    } finally {
      setIsRemovingLogo(false);
    }
  };

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SiteSettingsSectionTitle>Site details</SiteSettingsSectionTitle>
          <Button
            disabled={isSavingName || name.trim() === site.name || !name.trim()}
            onClick={() => void saveName()}
            size="compact"
          >
            {isSavingName ? <Spinner className="size-3.5" /> : null}
            Save name
          </Button>
        </div>
        <div className="space-y-2">
          <Label htmlFor="site-name">Name</Label>
          <Input
            className="text-base sm:text-sm"
            id="site-name"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void saveName();
              if (event.key === "Escape") setName(site.name);
            }}
            value={name}
          />
        </div>
      </section>

      <section className="space-y-4">
        <SiteSettingsSectionTitle>Brand assets</SiteSettingsSectionTitle>
        <AssetRow label="Logo">
          <ImageAssetDropZone
            alt="Site logo"
            isUploading={uploadState.isUploading || isSavingLogo}
            isRemoving={isRemovingLogo}
            onFileAccepted={(file) => void uploadLogo(file)}
            onRemove={() => void removeLogo()}
            progress={uploadState.progress?.percentage}
            src={site.logoFileId ? managedFilePath(site.logoFileId) : undefined}
          />
        </AssetRow>
        <AssetRow label="Favicon">
          <FaviconSettings
            faviconFileId={site.faviconFileId}
            siteId={siteId}
            onChange={async (faviconFileId) => {
              await updateSite(
                faviconFileId
                  ? { siteId, faviconFileId }
                  : { siteId, clearFavicon: true },
              );
            }}
          />
        </AssetRow>
      </section>
    </div>
  );
}

function AssetRow({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">{children}</div>
    </div>
  );
}
