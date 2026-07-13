"use client";

import { useImageUpload } from "@/components/site-elements/use-image-upload";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";
import { toast } from "sonner";

export function FaviconSettings({
  favicon,
  onChange,
  siteId,
}: {
  favicon?: string;
  onChange: (favicon?: string) => Promise<void>;
  siteId: Id<"sites">;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, uploadState } = useImageUpload();

  const upload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const result = await uploadImage(file, siteId).catch(() => null);
    if (!result) {
      toast.error(uploadState.error ?? "Upload failed");
      return;
    }

    await onChange(result.url);
    toast.success("Favicon updated");
  };

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".ico,.png,.jpg,.jpeg,.webp,.svg,image/*"
        className="hidden"
        onChange={(event) => {
          void upload(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {favicon ? (
        <div className="flex size-8 items-center justify-center rounded-md border border-border/70 bg-background p-1">
          <Image
            src={favicon}
            alt="Favicon preview"
            className="size-full object-contain"
            width={24}
            height={24}
            unoptimized
          />
        </div>
      ) : (
        <div className="flex size-8 items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/20 text-muted-foreground">
          <ImageIcon className="size-3.5" />
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => inputRef.current?.click()}
        disabled={uploadState.isUploading}
        aria-label={favicon ? "Replace favicon" : "Upload favicon"}
      >
        {uploadState.isUploading ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Upload className="size-3" />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={() => void onChange(undefined)}
        disabled={!favicon || uploadState.isUploading}
        aria-label="Remove favicon"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
