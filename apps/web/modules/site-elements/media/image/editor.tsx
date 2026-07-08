"use client";

import { useImageUpload } from "@/lib/files";
import { cn } from "@/lib/utils";
import type { ElementEditorProps } from "@/modules/site-elements/authoring/registry";
import { useEditorSite } from "@/modules/editor/app/editor-context";
import { DropZone } from "@/modules/file-ui";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
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
  isResizing: boolean;
  maxWidth: number;
}

type ImageEditorAction =
  | { type: "setMaxWidth"; value: number }
  | { type: "setResizing"; value: boolean };

function createImageEditorState(): ImageEditorState {
  return {
    isResizing: false,
    maxWidth: 800,
  };
}

function imageEditorReducer(
  state: ImageEditorState,
  action: ImageEditorAction,
): ImageEditorState {
  switch (action.type) {
    case "setMaxWidth":
      return { ...state, maxWidth: action.value };
    case "setResizing":
      return { ...state, isResizing: action.value };
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

function ImagePreview({
  content,
  fileInputRef,
  imageUrl,
  isResizing,
  isSelected,
  isUploading,
  maxWidth,
  onFilesAccepted,
  onRemoveImage,
  onResizeStart,
  onResizeStop,
}: {
  content: ElementEditorProps<"image">["content"];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  imageUrl: string;
  isResizing: boolean;
  isSelected: boolean;
  isUploading: boolean;
  maxWidth: number;
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
            <Button variant="destructive" size="sm" onClick={onRemoveImage}>
              <Trash2 className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        )}
      </Resizable>

      {content.caption && (
        <figcaption className="mt-2 text-sm text-muted-foreground text-center">
          {content.caption}
        </figcaption>
      )}
    </figure>
  );
}

export function ImageEditor({
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
    undefined,
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
    onSaveStatusChange?.("saved");
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
        isResizing={state.isResizing}
        isSelected={Boolean(isSelected)}
        isUploading={isUploading}
        maxWidth={state.maxWidth}
        onFilesAccepted={handleFilesAccepted}
        onRemoveImage={handleRemoveImage}
        onResizeStart={() => dispatch({ type: "setResizing", value: true })}
        onResizeStop={handleResizeStop}
      />
    </div>
  );
}
