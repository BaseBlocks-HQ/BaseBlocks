"use client";

import { useImageUpload } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { ElementEditorProps } from "@/modules/elements/framework/registry";
import { useEditorSite } from "@/modules/shared/contexts/editor-context";
import { DropZone } from "@/modules/shared/file-ui";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { ImageIcon, Loader2, Pencil, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { Resizable } from "re-resizable";
import { useEffect, useReducer, useRef } from "react";
import { toast } from "sonner";

const ResizeHandle = ({ position }: { position: string }) => (
  <div
    className={cn(
      "absolute w-3 h-3 bg-primary border-2 border-background rounded-sm opacity-0 group-hover:opacity-100 transition-opacity",
      position === "topLeft" &&
        "top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
      position === "topRight" &&
        "top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
      position === "bottomLeft" &&
        "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
      position === "bottomRight" &&
        "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
    )}
  />
);

function constrainImageDimensions(
  width: number,
  height: number,
  maxWidth: number,
) {
  if (width <= maxWidth) {
    return { width, height };
  }

  const scale = maxWidth / width;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

interface ImageEditorState {
  alt: string;
  caption: string;
  isEditingMeta: boolean;
  isResizing: boolean;
  maxWidth: number;
}

type ImageEditorAction =
  | { type: "beginMetaEdit" }
  | { type: "cancelMeta"; alt: string; caption: string }
  | { type: "clearMeta" }
  | { type: "saveMeta" }
  | { type: "setAlt"; value: string }
  | { type: "setCaption"; value: string }
  | { type: "setMaxWidth"; value: number }
  | { type: "setResizing"; value: boolean }
  | { type: "syncMeta"; alt: string; caption: string };

function createImageEditorState(content: {
  alt?: string;
  caption?: string;
}): ImageEditorState {
  return {
    alt: content.alt ?? "",
    caption: content.caption ?? "",
    isEditingMeta: false,
    isResizing: false,
    maxWidth: 800,
  };
}

function imageEditorReducer(
  state: ImageEditorState,
  action: ImageEditorAction,
): ImageEditorState {
  switch (action.type) {
    case "beginMetaEdit":
      return { ...state, isEditingMeta: true };
    case "cancelMeta":
      return {
        ...state,
        alt: action.alt,
        caption: action.caption,
        isEditingMeta: false,
      };
    case "clearMeta":
      return {
        ...state,
        alt: "",
        caption: "",
        isEditingMeta: false,
      };
    case "saveMeta":
      return { ...state, isEditingMeta: false };
    case "setAlt":
      return { ...state, alt: action.value };
    case "setCaption":
      return { ...state, caption: action.value };
    case "setMaxWidth":
      return { ...state, maxWidth: action.value };
    case "setResizing":
      return { ...state, isResizing: action.value };
    case "syncMeta":
      if (state.isEditingMeta) {
        return state;
      }

      return {
        ...state,
        alt: action.alt,
        caption: action.caption,
      };
    default:
      return state;
  }
}

function ImageUploadState({
  isUploading,
  onFilesAccepted,
  uploadProgress,
}: {
  isUploading: boolean;
  onFilesAccepted: (files: File[]) => void;
  uploadProgress: number;
}) {
  if (isUploading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed rounded-lg border-primary/50 bg-primary/5">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">
          Uploading image...
        </p>
        <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{uploadProgress}%</p>
      </div>
    );
  }

  return (
    <DropZone
      onFilesAccepted={onFilesAccepted}
      accept={{
        "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
      }}
      maxSize={10 * 1024 * 1024}
      className="py-8"
    >
      <div className="flex flex-col items-center justify-center py-4 px-4">
        <div className="rounded-full p-3 mb-3 bg-muted">
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">
          Drop an image here
        </p>
        <p className="text-xs text-muted-foreground">
          or click to browse (max 10MB)
        </p>
      </div>
    </DropZone>
  );
}

function ImageMetadataPanel({
  alt,
  caption,
  id,
  onAltChange,
  onCancel,
  onCaptionChange,
  onSave,
}: {
  alt: string;
  caption: string;
  id: string;
  onAltChange: (value: string) => void;
  onCancel: () => void;
  onCaptionChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-3 p-3 bg-muted/50 rounded-lg border space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-alt`} className="text-xs">
          Alt text
        </Label>
        <Input
          id={`${id}-alt`}
          value={alt}
          onChange={(event) => onAltChange(event.target.value)}
          placeholder="Describe the image for accessibility"
          className="text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-caption`} className="text-xs">
          Caption
        </Label>
        <Input
          id={`${id}-caption`}
          value={caption}
          onChange={(event) => onCaptionChange(event.target.value)}
          placeholder="Optional caption to display below image"
          className="text-sm"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSave}>
          Save
        </Button>
      </div>
    </div>
  );
}

function ImagePreview({
  content,
  fileInputRef,
  imageUrl,
  isEditingMeta,
  isResizing,
  isSelected,
  isUploading,
  maxWidth,
  onEditMetadata,
  onFilesAccepted,
  onRemoveImage,
  onResizeStart,
  onResizeStop,
}: {
  content: ElementEditorProps<"image">["content"];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  imageUrl: string;
  isEditingMeta: boolean;
  isResizing: boolean;
  isSelected: boolean;
  isUploading: boolean;
  maxWidth: number;
  onEditMetadata: () => void;
  onFilesAccepted: (files: File[]) => void;
  onRemoveImage: () => void;
  onResizeStart: () => void;
  onResizeStop: (
    event: MouseEvent | TouchEvent,
    direction: string,
    ref: HTMLElement,
  ) => void;
}) {
  return (
    <figure className="relative">
      <Resizable
        size={{
          width: content.width || "auto",
          height: content.height || "auto",
        }}
        minWidth={100}
        minHeight={100}
        maxWidth={maxWidth}
        lockAspectRatio
        enable={{
          top: false,
          right: false,
          bottom: false,
          left: false,
          topRight: true,
          bottomRight: true,
          bottomLeft: true,
          topLeft: true,
        }}
        onResizeStart={onResizeStart}
        onResizeStop={onResizeStop}
        handleComponent={{
          topLeft: <ResizeHandle position="topLeft" />,
          topRight: <ResizeHandle position="topRight" />,
          bottomLeft: <ResizeHandle position="bottomLeft" />,
          bottomRight: <ResizeHandle position="bottomRight" />,
        }}
        handleStyles={{
          topLeft: { top: 0, left: 0, cursor: "nwse-resize" },
          topRight: { top: 0, right: 0, cursor: "nesw-resize" },
          bottomLeft: { bottom: 0, left: 0, cursor: "nesw-resize" },
          bottomRight: { bottom: 0, right: 0, cursor: "nwse-resize" },
        }}
        className={cn(
          "relative group",
          isResizing && "ring-2 ring-primary",
          isSelected && "ring-2 ring-primary/50",
        )}
      >
        <Image
          src={imageUrl}
          alt={content.alt || ""}
          className={cn(
            "w-full h-full rounded-lg",
            content.objectFit === "cover" && "object-cover",
            content.objectFit === "contain" && "object-contain",
            content.objectFit === "fill" && "object-fill",
            !content.objectFit && "object-cover",
          )}
          width={1600}
          height={900}
          unoptimized
          draggable={false}
        />

        {!isResizing && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 rounded-lg">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const files = Array.from(event.target.files || []);
                if (files.length > 0) {
                  onFilesAccepted(files);
                }
                event.target.value = "";
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-1" />
              )}
              Replace
            </Button>
            <Button variant="secondary" size="sm" onClick={onEditMetadata}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={onRemoveImage}>
              <Trash2 className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        )}
      </Resizable>

      {content.caption && !isEditingMeta && (
        <figcaption className="mt-2 text-sm text-muted-foreground text-center">
          {content.caption}
        </figcaption>
      )}
    </figure>
  );
}

export function ImageEditor({
  id,
  content,
  isSelected,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"image">) {
  const { siteId } = useEditorSite();
  const { uploadImage, uploadState } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, dispatch] = useReducer(
    imageEditorReducer,
    content,
    createImageEditorState,
  );

  const isUploading = uploadState.isUploading;
  const uploadProgress = uploadState.progress?.percentage || 0;

  useEffect(() => {
    const container = containerRef.current;
    if (!container?.parentElement) {
      return;
    }

    const updateMaxWidth = () => {
      if (container.parentElement) {
        dispatch({
          type: "setMaxWidth",
          value: container.parentElement.offsetWidth - 32,
        });
      }
    };

    updateMaxWidth();

    const observer = new ResizeObserver(updateMaxWidth);
    observer.observe(container.parentElement);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    dispatch({
      type: "syncMeta",
      alt: content.alt ?? "",
      caption: content.caption ?? "",
    });
  }, [content.alt, content.caption]);

  const getMaxWidth = () => {
    if (containerRef.current?.parentElement) {
      return containerRef.current.parentElement.offsetWidth - 32;
    }

    return 800;
  };

  const handleFilesAccepted = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    onSaveStatusChange?.("saving");

    const result = await uploadImage(file, siteId as Id<"sites">);

    if (result) {
      const imageWidth = result.width;
      const imageHeight = result.height;
      const hasImageDimensions =
        typeof imageWidth === "number" && typeof imageHeight === "number";
      const constrainedDimensions = hasImageDimensions
        ? constrainImageDimensions(imageWidth, imageHeight, getMaxWidth())
        : undefined;

      toast.success("Image uploaded");
      await onUpdate({
        ...content,
        url: result.url,
        width: constrainedDimensions?.width,
        height: constrainedDimensions?.height,
      });
      onSaveStatusChange?.("saved");
    } else if (uploadState.error) {
      toast.error(uploadState.error);
      onSaveStatusChange?.("idle");
    }
  };

  const handleRemoveImage = async () => {
    onSaveStatusChange?.("saving");
    await onUpdate({
      url: "",
      alt: "",
      caption: "",
    });
    dispatch({ type: "clearMeta" });
    onSaveStatusChange?.("saved");
  };

  const handleSaveMeta = async () => {
    onSaveStatusChange?.("saving");
    await onUpdate({
      ...content,
      alt: state.alt,
      caption: state.caption,
    });
    dispatch({ type: "saveMeta" });
    onSaveStatusChange?.("saved");
  };

  const handleCancelMeta = () => {
    dispatch({
      type: "cancelMeta",
      alt: content.alt ?? "",
      caption: content.caption ?? "",
    });
  };

  const handleResizeStop = async (
    _e: MouseEvent | TouchEvent,
    _direction: string,
    ref: HTMLElement,
  ) => {
    dispatch({ type: "setResizing", value: false });
    const newWidth = ref.offsetWidth;
    const newHeight = ref.offsetHeight;

    onSaveStatusChange?.("saving");
    await onUpdate({
      ...content,
      width: newWidth,
      height: newHeight,
    });
    onSaveStatusChange?.("saved");
  };

  const imageUrl = content.url ? content.url : "";

  if (!content.url) {
    return (
      <div ref={containerRef} className="rounded-md transition-colors">
        <ImageUploadState
          isUploading={isUploading}
          onFilesAccepted={handleFilesAccepted}
          uploadProgress={uploadProgress}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="rounded-md transition-colors group/editor relative"
    >
      <ImagePreview
        content={content}
        fileInputRef={fileInputRef}
        imageUrl={imageUrl}
        isEditingMeta={state.isEditingMeta}
        isResizing={state.isResizing}
        isSelected={Boolean(isSelected)}
        isUploading={isUploading}
        maxWidth={state.maxWidth}
        onEditMetadata={() => dispatch({ type: "beginMetaEdit" })}
        onFilesAccepted={handleFilesAccepted}
        onRemoveImage={handleRemoveImage}
        onResizeStart={() => dispatch({ type: "setResizing", value: true })}
        onResizeStop={handleResizeStop}
      />

      {state.isEditingMeta && (
        <ImageMetadataPanel
          alt={state.alt}
          caption={state.caption}
          id={id}
          onAltChange={(value) => dispatch({ type: "setAlt", value })}
          onCancel={handleCancelMeta}
          onCaptionChange={(value) => dispatch({ type: "setCaption", value })}
          onSave={handleSaveMeta}
        />
      )}
    </div>
  );
}
