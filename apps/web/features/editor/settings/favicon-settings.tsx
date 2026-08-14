"use client";

import { useImageUpload } from "@/lib/files/use-image-upload";
import type { Id } from "@baseblocks/backend";
import { useState } from "react";
import { toast } from "sonner";
import { ImageAssetDropZone } from "./image-asset-dropzone";

export function FaviconSettings({
  faviconFileId,
  onChange,
  siteId,
}: {
  faviconFileId?: Id<"files">;
  onChange: (faviconFileId?: Id<"files">) => Promise<void>;
  siteId: Id<"sites">;
}) {
  const { uploadImage, uploadState } = useImageUpload();
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const upload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Select an image file.");
      return;
    }

    if (isSaving) return;
    setIsSaving(true);
    try {
      const result = await uploadImage(file, siteId);
      if (!result) throw new Error("Upload failed");
      await onChange(result.fileId);
      toast.success("Favicon updated");
    } catch {
      toast.error(
        uploadState.error ?? "Unable to save the favicon. Try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (isRemoving) return;
    setIsRemoving(true);
    try {
      await onChange(undefined);
      toast.success("Favicon removed");
    } catch {
      toast.error("Unable to remove the favicon. Try again.");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <ImageAssetDropZone
      alt="Favicon"
      isRemoving={isRemoving}
      isUploading={uploadState.isUploading || isSaving}
      onFileAccepted={(file) => void upload(file)}
      onRemove={() => void remove()}
      progress={uploadState.progress?.percentage}
      src={faviconFileId ? `/api/files/${faviconFileId}` : undefined}
    />
  );
}
