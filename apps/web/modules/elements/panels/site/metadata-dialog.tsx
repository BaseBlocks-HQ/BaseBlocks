"use client";

import { useImageUpload } from "@/lib/storage";
import { toProxyDownloadUrl } from "@/lib/storage/client";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@baseblocks/ui/dialog";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { Textarea } from "@baseblocks/ui/textarea";
import { FileText, Image, ImageIcon, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface MetadataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: Id<"sites">;
  siteName: string;
  initialValues: {
    siteTitle: string;
    siteDescription: string;
    siteKeywords: string;
    favicon: string;
    ogImage: string;
  };
  onSave: (values: {
    siteTitle?: string;
    siteDescription?: string;
    siteKeywords?: string;
    favicon?: string;
    ogImage?: string;
  }) => Promise<void>;
}

export function MetadataDialog({
  open,
  onOpenChange,
  siteId,
  siteName,
  initialValues,
  onSave,
}: MetadataDialogProps) {
  const { uploadImage, uploadState } = useImageUpload();
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const ogImageInputRef = useRef<HTMLInputElement>(null);

  const [localSiteTitle, setLocalSiteTitle] = useState(initialValues.siteTitle);
  const [localSiteDescription, setLocalSiteDescription] = useState(
    initialValues.siteDescription,
  );
  const [localSiteKeywords, setLocalSiteKeywords] = useState(
    initialValues.siteKeywords,
  );
  const [localFavicon, setLocalFavicon] = useState(initialValues.favicon);
  const [localOgImage, setLocalOgImage] = useState(initialValues.ogImage);
  const [metadataUploadingField, setMetadataUploadingField] = useState<
    "favicon" | "ogImage" | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);

  const isUploading = uploadState.isUploading;
  const uploadProgress = uploadState.progress?.percentage || 0;
  const isFaviconUploading =
    metadataUploadingField === "favicon" && isUploading;
  const isOgImageUploading =
    metadataUploadingField === "ogImage" && isUploading;
  const isMetadataUploading = metadataUploadingField !== null && isUploading;

  const toOptionalSetting = (value: string): string | undefined => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };

  const handleImageUpload = async (
    field: "favicon" | "ogImage",
    file?: File,
  ) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setMetadataUploadingField(field);
    try {
      const result = await uploadImage(file, siteId);
      if (!result) {
        toast.error(uploadState.error || "Upload failed");
        return;
      }
      if (field === "favicon") {
        setLocalFavicon(result.url);
      } else {
        setLocalOgImage(result.url);
      }
      toast.success(
        field === "favicon" ? "Favicon uploaded" : "OG image uploaded",
      );
    } finally {
      setMetadataUploadingField((current) =>
        current === field ? null : current,
      );
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        favicon: toOptionalSetting(localFavicon),
        ogImage: toOptionalSetting(localOgImage),
        siteTitle: toOptionalSetting(localSiteTitle),
        siteDescription: toOptionalSetting(localSiteDescription),
        siteKeywords: toOptionalSetting(localSiteKeywords),
      });
      onOpenChange(false);
      toast.success("Metadata settings updated");
    } catch (_error) {
      toast.error("Failed to update metadata settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) onOpenChange(true);
      }}
    >
      <DialogContent
        className="max-w-3xl p-0 gap-0"
        showCloseButton={false}
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onFocusOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>SEO & Metadata</DialogTitle>
          <DialogDescription>
            Configure metadata for your published site.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="site-meta-title" className="text-sm">
                Site Title
              </Label>
              <Input
                id="site-meta-title"
                value={localSiteTitle}
                onChange={(e) => setLocalSiteTitle(e.target.value)}
                placeholder={siteName}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="site-meta-keywords" className="text-sm">
                Keywords
              </Label>
              <Input
                id="site-meta-keywords"
                value={localSiteKeywords}
                onChange={(e) => setLocalSiteKeywords(e.target.value)}
                placeholder="knowledge base, support, docs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="site-meta-description" className="text-sm">
              Description
            </Label>
            <Textarea
              id="site-meta-description"
              value={localSiteDescription}
              onChange={(e) => setLocalSiteDescription(e.target.value)}
              placeholder="Short summary for search engines and social cards"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-3 rounded-xl border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Image className="h-4 w-4 text-muted-foreground" />
                Favicon
              </div>
              {localFavicon ? (
                <div className="h-16 w-16 rounded-lg border bg-background p-2">
                  <img
                    src={toProxyDownloadUrl(localFavicon)}
                    alt="Favicon preview"
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="h-16 w-16 rounded-lg border bg-background flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-4 w-4" />
                </div>
              )}
              <input
                ref={faviconInputRef}
                type="file"
                accept=".ico,.png,.jpg,.jpeg,.webp,.svg,image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  void handleImageUpload("favicon", file);
                  e.target.value = "";
                }}
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    faviconInputRef.current?.click();
                  }}
                  disabled={isMetadataUploading || isSaving}
                >
                  {isFaviconUploading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <Upload className="h-3 w-3 mr-1" />
                      {localFavicon ? "Replace" : "Upload"}
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocalFavicon("")}
                  disabled={!localFavicon || isMetadataUploading || isSaving}
                >
                  Remove
                </Button>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Open Graph Image
              </div>
              {localOgImage ? (
                <img
                  src={toProxyDownloadUrl(localOgImage)}
                  alt="Open Graph preview"
                  className="h-20 w-full rounded border bg-muted object-cover"
                />
              ) : (
                <div className="h-20 w-full rounded border bg-muted flex items-center justify-center text-muted-foreground">
                  No image
                </div>
              )}
              <input
                ref={ogImageInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg,image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  void handleImageUpload("ogImage", file);
                  e.target.value = "";
                }}
              />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    ogImageInputRef.current?.click();
                  }}
                  disabled={isMetadataUploading || isSaving}
                >
                  {isOgImageUploading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <Upload className="h-3 w-3 mr-1" />
                      {localOgImage ? "Replace" : "Upload"}
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocalOgImage("")}
                  disabled={!localOgImage || isMetadataUploading || isSaving}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving || isMetadataUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isMetadataUploading}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Saving
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
