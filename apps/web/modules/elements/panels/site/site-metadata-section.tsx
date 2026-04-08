"use client";

import { useImageUpload } from "@/lib/storage";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { Textarea } from "@baseblocks/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
import { ImageIcon, Info, Loader2, Trash2, Upload } from "lucide-react";
import NextImage from "next/image";
import { useEffect, useMemo, useReducer, useRef } from "react";
import { toast } from "sonner";

interface SiteMetadataSectionProps {
  siteId: Id<"sites">;
  siteName: string;
  initialValues: MetadataValues;
  onSave: (values: Partial<MetadataValues>) => Promise<void>;
}

type MetadataAssetField = "favicon" | "ogImage";

interface MetadataValues {
  favicon: string;
  ogImage: string;
  siteDescription: string;
  siteKeywords: string;
  siteTitle: string;
}

interface MetadataState extends MetadataValues {
  isSaving: boolean;
  uploadingField: MetadataAssetField | null;
}

type MetadataAction =
  | { type: "reset"; values: MetadataValues }
  | {
      type: "setField";
      field: keyof MetadataValues;
      value: string;
    }
  | { type: "setSaving"; value: boolean }
  | { type: "setUploadingField"; value: MetadataAssetField | null };

function createMetadataState(values: MetadataValues): MetadataState {
  return {
    ...values,
    isSaving: false,
    uploadingField: null,
  };
}

function metadataReducer(
  state: MetadataState,
  action: MetadataAction,
): MetadataState {
  switch (action.type) {
    case "reset":
      return createMetadataState(action.values);
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

function MetadataLabel({
  htmlFor,
  label,
  tooltip,
}: {
  htmlFor?: string;
  label: string;
  tooltip: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 pr-1">
      <Label className="text-sm font-medium leading-tight" htmlFor={htmlFor}>
        {label}
      </Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex shrink-0 rounded-sm text-muted-foreground/70 outline-offset-2 hover:text-foreground focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`About ${label}`}
          >
            <Info className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[min(280px,calc(100vw-2rem))] text-pretty"
        >
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function MetadataRow({
  children,
  label,
  tooltip,
  htmlFor,
}: {
  children: React.ReactNode;
  label: string;
  tooltip: string;
  htmlFor?: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-2.5">
      <MetadataLabel htmlFor={htmlFor} label={label} tooltip={tooltip} />
      <div className="mt-2 min-w-0 max-w-full">{children}</div>
    </div>
  );
}

function MetadataTextareaRow({
  children,
  label,
  tooltip,
  htmlFor,
}: {
  children: React.ReactNode;
  label: string;
  tooltip: string;
  htmlFor?: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/80 px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <MetadataLabel htmlFor={htmlFor} label={label} tooltip={tooltip} />
      </div>
      {children}
    </div>
  );
}

export function SiteMetadataSection({
  siteId,
  siteName,
  initialValues,
  onSave,
}: SiteMetadataSectionProps) {
  const { uploadImage, uploadState } = useImageUpload();
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const ogImageInputRef = useRef<HTMLInputElement>(null);
  const [state, dispatch] = useReducer(
    metadataReducer,
    initialValues,
    createMetadataState,
  );
  const initialSnapshot = useMemo(
    () => ({
      favicon: initialValues.favicon,
      ogImage: initialValues.ogImage,
      siteDescription: initialValues.siteDescription,
      siteKeywords: initialValues.siteKeywords,
      siteTitle: initialValues.siteTitle,
    }),
    [
      initialValues.favicon,
      initialValues.ogImage,
      initialValues.siteDescription,
      initialValues.siteKeywords,
      initialValues.siteTitle,
    ],
  );

  useEffect(() => {
    dispatch({ type: "reset", values: initialSnapshot });
  }, [initialSnapshot]);

  const hasUnsavedChanges = useMemo(
    () =>
      state.favicon !== initialSnapshot.favicon ||
      state.ogImage !== initialSnapshot.ogImage ||
      state.siteDescription !== initialSnapshot.siteDescription ||
      state.siteKeywords !== initialSnapshot.siteKeywords ||
      state.siteTitle !== initialSnapshot.siteTitle,
    [
      initialSnapshot.favicon,
      initialSnapshot.ogImage,
      initialSnapshot.siteDescription,
      initialSnapshot.siteKeywords,
      initialSnapshot.siteTitle,
      state.favicon,
      state.ogImage,
      state.siteDescription,
      state.siteKeywords,
      state.siteTitle,
    ],
  );

  const isUploading = uploadState.isUploading;
  const isMetadataUploading = state.uploadingField !== null && isUploading;
  const isFaviconUploading = state.uploadingField === "favicon" && isUploading;
  const isOgImageUploading = state.uploadingField === "ogImage" && isUploading;

  const handleImageUpload = async (field: MetadataAssetField, file?: File) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    dispatch({ type: "setUploadingField", value: field });

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
    dispatch({ type: "setUploadingField", value: null });
    toast.success(
      field === "favicon" ? "Favicon uploaded" : "OG image uploaded",
    );
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
      toast.success("Metadata settings updated");
    } else {
      toast.error("Failed to update metadata settings");
    }

    dispatch({ type: "setSaving", value: false });
  };

  return (
    <div className="space-y-3">
      <MetadataRow
        htmlFor="site-meta-title"
        label="Title"
        tooltip="Default title used in browser tabs, search results, and social cards."
      >
        <Input
          id="site-meta-title"
          value={state.siteTitle}
          onChange={(event) =>
            dispatch({
              type: "setField",
              field: "siteTitle",
              value: event.target.value,
            })
          }
          placeholder={siteName}
          className="h-8 w-full max-w-full text-sm"
        />
      </MetadataRow>

      <MetadataRow
        htmlFor="site-meta-keywords"
        label="Keywords"
        tooltip="Comma-separated keywords stored in page metadata."
      >
        <Input
          id="site-meta-keywords"
          value={state.siteKeywords}
          onChange={(event) =>
            dispatch({
              type: "setField",
              field: "siteKeywords",
              value: event.target.value,
            })
          }
          placeholder="knowledge base, docs, support"
          className="h-8 w-full max-w-full text-sm"
        />
      </MetadataRow>

      <MetadataTextareaRow
        htmlFor="site-meta-description"
        label="Description"
        tooltip="Default summary used in search results and link previews."
      >
        <Textarea
          id="site-meta-description"
          value={state.siteDescription}
          onChange={(event) =>
            dispatch({
              type: "setField",
              field: "siteDescription",
              value: event.target.value,
            })
          }
          placeholder="Short summary for search engines and social cards"
          rows={3}
          className="resize-none"
        />
      </MetadataTextareaRow>

      <MetadataRow
        label="Favicon"
        tooltip="Small site icon used in tabs, bookmarks, and app shortcuts."
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <input
            ref={faviconInputRef}
            type="file"
            accept=".ico,.png,.jpg,.jpeg,.webp,.svg,image/*"
            className="hidden"
            onChange={(event) => {
              void handleImageUpload("favicon", event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          {state.favicon ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-background p-1">
              <NextImage
                src={state.favicon}
                alt="Favicon preview"
                className="h-full w-full object-contain"
                width={24}
                height={24}
                unoptimized
              />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/20 text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5" />
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => faviconInputRef.current?.click()}
            disabled={state.isSaving || isMetadataUploading}
            aria-label={state.favicon ? "Replace favicon" : "Upload favicon"}
          >
            {isFaviconUploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() =>
              dispatch({ type: "setField", field: "favicon", value: "" })
            }
            disabled={!state.favicon || state.isSaving || isMetadataUploading}
            aria-label="Remove favicon"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </MetadataRow>

      <MetadataRow
        label="Social image"
        tooltip="Wide preview image shown when the site is shared in social apps."
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <input
            ref={ogImageInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp,image/*"
            className="hidden"
            onChange={(event) => {
              void handleImageUpload("ogImage", event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          {state.ogImage ? (
            <NextImage
              src={state.ogImage}
              alt="Open Graph image preview"
              className="h-8 w-14 rounded-md border border-border/70 object-cover"
              width={56}
              height={32}
              unoptimized
            />
          ) : (
            <div className="flex h-8 w-14 items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/20 text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5" />
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => ogImageInputRef.current?.click()}
            disabled={state.isSaving || isMetadataUploading}
            aria-label={
              state.ogImage ? "Replace social image" : "Upload social image"
            }
          >
            {isOgImageUploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() =>
              dispatch({ type: "setField", field: "ogImage", value: "" })
            }
            disabled={!state.ogImage || state.isSaving || isMetadataUploading}
            aria-label="Remove social image"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </MetadataRow>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={() => dispatch({ type: "reset", values: initialSnapshot })}
          disabled={!hasUnsavedChanges || state.isSaving || isMetadataUploading}
        >
          Reset
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8"
          onClick={handleSave}
          disabled={!hasUnsavedChanges || state.isSaving || isMetadataUploading}
        >
          {state.isSaving ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Saving
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </div>
  );
}
