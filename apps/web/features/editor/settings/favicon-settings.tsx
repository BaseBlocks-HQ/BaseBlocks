"use client";

import { useImageUpload } from "@/lib/files/use-image-upload";
import type { Id } from "@baseblocks/backend";
import { useState } from "react";
import { toast } from "sonner";
import { ImageAssetDropZone } from "./image-asset-dropzone";

export function FaviconSettings({
  favicon,
  onChange,
  siteId,
}: {
  favicon?: string;
  onChange: (favicon?: string) => Promise<void>;
  siteId: Id<"sites">;
}) {
  const { uploadImage, uploadState } = useImageUpload();
  const [isRemoving, setIsRemoving] = useState(false);

  const upload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Select an image file.");
      return;
    }

    const result = await uploadImage(file, siteId).catch(() => null);
    if (!result) {
      toast.error(
        uploadState.error ?? "Unable to upload the favicon. Try again.",
      );
      return;
    }

    await onChange(result.url);
    toast.success("Favicon updated");
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
      isUploading={uploadState.isUploading}
      onFileAccepted={(file) => void upload(file)}
      onRemove={() => void remove()}
      progress={uploadState.progress?.percentage}
      src={favicon}
    />
  );
}
