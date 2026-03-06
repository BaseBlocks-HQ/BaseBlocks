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
import NextImage from "next/image";
import { useEffect, useReducer, useRef } from "react";
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

type MetadataAssetField = "favicon" | "ogImage";

interface MetadataFormState {
  favicon: string;
  ogImage: string;
  siteDescription: string;
  siteKeywords: string;
  siteTitle: string;
  uploadingField: MetadataAssetField | null;
  isSaving: boolean;
}

type MetadataFormAction =
  | {
      type: "reset";
      values: MetadataDialogProps["initialValues"];
    }
  | { type: "setField"; field: keyof Omit<MetadataFormState, "isSaving" | "uploadingField">; value: string }
  | { type: "setSaving"; value: boolean }
  | { type: "setUploadingField"; value: MetadataAssetField | null };

function createMetadataFormState(
  values: MetadataDialogProps["initialValues"],
): MetadataFormState {
  return {
    favicon: values.favicon,
    ogImage: values.ogImage,
    siteDescription: values.siteDescription,
    siteKeywords: values.siteKeywords,
    siteTitle: values.siteTitle,
    uploadingField: null,
    isSaving: false,
  };
}

function metadataFormReducer(
  state: MetadataFormState,
  action: MetadataFormAction,
): MetadataFormState {
  switch (action.type) {
    case "reset":
      return createMetadataFormState(action.values);
    case "setField":
      return { ...state, [action.field]: action.value };
    case "setSaving":
      return { ...state, isSaving: action.value };
    case "setUploadingField":
      return { ...state, uploadingField: action.value };
    default:
      return state;
  }
}

function toOptionalSetting(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function MetadataTextFields({
  description,
  keywords,
  onDescriptionChange,
  onKeywordsChange,
  onTitleChange,
  siteName,
  title,
}: {
  description: string;
  keywords: string;
  onDescriptionChange: (value: string) => void;
  onKeywordsChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  siteName: string;
  title: string;
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="site-meta-title" className="text-sm">
            Site Title
          </Label>
          <Input
            id="site-meta-title"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder={siteName}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="site-meta-keywords" className="text-sm">
            Keywords
          </Label>
          <Input
            id="site-meta-keywords"
            value={keywords}
            onChange={(event) => onKeywordsChange(event.target.value)}
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
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="Short summary for search engines and social cards"
          rows={3}
        />
      </div>
    </>
  );
}

function MetadataAssetCard({
  accept,
  alt,
  disabled,
  emptyState,
  icon,
  imageUrl,
  inputRef,
  isUploading,
  onClear,
  onFileSelected,
  title,
  uploadProgress,
}: {
  accept: string;
  alt: string;
  disabled: boolean;
  emptyState: React.ReactNode;
  icon: React.ReactNode;
  imageUrl: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  isUploading: boolean;
  onClear: () => void;
  onFileSelected: (file?: File) => void;
  title: string;
  uploadProgress: number;
}) {
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </div>
      {imageUrl ? (
        title === "Favicon" ? (
          <div className="h-16 w-16 rounded-lg border bg-background p-2">
            <NextImage
              src={toProxyDownloadUrl(imageUrl)}
              alt={alt}
              className="h-full w-full object-contain"
              width={64}
              height={64}
              unoptimized
            />
          </div>
        ) : (
          <NextImage
            src={toProxyDownloadUrl(imageUrl)}
            alt={alt}
            className="h-20 w-full rounded border bg-muted object-cover"
            width={1200}
            height={630}
            unoptimized
          />
        )
      ) : (
        emptyState
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          onFileSelected(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            inputRef.current?.click();
          }}
          disabled={disabled}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              {uploadProgress}%
            </>
          ) : (
            <>
              <Upload className="h-3 w-3 mr-1" />
              {imageUrl ? "Replace" : "Upload"}
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          disabled={!imageUrl || disabled}
        >
          Remove
        </Button>
      </div>
    </div>
  );
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
  const [state, dispatch] = useReducer(
    metadataFormReducer,
    initialValues,
    createMetadataFormState,
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    dispatch({ type: "reset", values: initialValues });
  }, [initialValues, open]);

  const isUploading = uploadState.isUploading;
  const uploadProgress = uploadState.progress?.percentage || 0;
  const isFaviconUploading = state.uploadingField === "favicon" && isUploading;
  const isOgImageUploading = state.uploadingField === "ogImage" && isUploading;
  const isMetadataUploading = state.uploadingField !== null && isUploading;

  const handleImageUpload = async (
    field: MetadataAssetField,
    file?: File,
  ) => {
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    dispatch({ type: "setUploadingField", value: field });
    const uploadSuccessMessage =
      field === "favicon" ? "Favicon uploaded" : "OG image uploaded";

    const result = await uploadImage(file, siteId).catch(() => null);

    if (!result) {
      toast.error(uploadState.error ?? "Upload failed");
      dispatch({ type: "setUploadingField", value: null });
      return;
    }

    dispatch({
      type: "setField",
      field,
      value: result.url,
    });
    toast.success(uploadSuccessMessage);
    dispatch({ type: "setUploadingField", value: null });
  };

  const handleSave = async () => {
    dispatch({ type: "setSaving", value: true });

    const didSave = await onSave({
      favicon: toOptionalSetting(state.favicon),
      ogImage: toOptionalSetting(state.ogImage),
      siteTitle: toOptionalSetting(state.siteTitle),
      siteDescription: toOptionalSetting(state.siteDescription),
      siteKeywords: toOptionalSetting(state.siteKeywords),
    })
      .then(() => true)
      .catch(() => false);

    if (didSave) {
      onOpenChange(false);
      toast.success("Metadata settings updated");
    } else {
      toast.error("Failed to update metadata settings");
    }

    dispatch({ type: "setSaving", value: false });
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
          <MetadataTextFields
            description={state.siteDescription}
            keywords={state.siteKeywords}
            onDescriptionChange={(value) =>
              dispatch({
                type: "setField",
                field: "siteDescription",
                value,
              })
            }
            onKeywordsChange={(value) =>
              dispatch({
                type: "setField",
                field: "siteKeywords",
                value,
              })
            }
            onTitleChange={(value) =>
              dispatch({
                type: "setField",
                field: "siteTitle",
                value,
              })
            }
            siteName={siteName}
            title={state.siteTitle}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MetadataAssetCard
              accept=".ico,.png,.jpg,.jpeg,.webp,.svg,image/*"
              alt="Favicon preview"
              disabled={isMetadataUploading || state.isSaving}
              emptyState={
                <div className="h-16 w-16 rounded-lg border bg-background flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-4 w-4" />
                </div>
              }
              icon={<Image className="h-4 w-4 text-muted-foreground" />}
              imageUrl={state.favicon}
              inputRef={faviconInputRef}
              isUploading={isFaviconUploading}
              onClear={() =>
                dispatch({ type: "setField", field: "favicon", value: "" })
              }
              onFileSelected={(file) => {
                void handleImageUpload("favicon", file);
              }}
              title="Favicon"
              uploadProgress={uploadProgress}
            />

            <MetadataAssetCard
              accept=".png,.jpg,.jpeg,.webp,.svg,image/*"
              alt="Open Graph preview"
              disabled={isMetadataUploading || state.isSaving}
              emptyState={
                <div className="h-20 w-full rounded border bg-muted flex items-center justify-center text-muted-foreground">
                  No image
                </div>
              }
              icon={<FileText className="h-4 w-4 text-muted-foreground" />}
              imageUrl={state.ogImage}
              inputRef={ogImageInputRef}
              isUploading={isOgImageUploading}
              onClear={() =>
                dispatch({ type: "setField", field: "ogImage", value: "" })
              }
              onFileSelected={(file) => {
                void handleImageUpload("ogImage", file);
              }}
              title="Open Graph Image"
              uploadProgress={uploadProgress}
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={state.isSaving || isMetadataUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={state.isSaving || isMetadataUploading}
          >
            {state.isSaving ? (
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
