"use client";

import { useImageUpload } from "@/lib/storage";
import { toProxyDownloadUrl } from "@/lib/storage/client";
import { cn } from "@/lib/utils";
import { DropZone } from "@/modules/documents";
import type { ElementEditorProps } from "@/modules/elements/registry";
import type { Id } from "@baseblocks/backend";
import { useEditorContext } from "@baseblocks/editor";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { ImageIcon, Loader2, Pencil, Trash2, Upload } from "lucide-react";
import { Resizable } from "re-resizable";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

// Custom handle component for resize corners
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

export function ImageEditor({
  id,
  content,
  isSelected,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"image">) {
  const { siteId } = useEditorContext();
  const { uploadImage, uploadState } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [localAlt, setLocalAlt] = useState(content.alt || "");
  const [localCaption, setLocalCaption] = useState(content.caption || "");
  const [isResizing, setIsResizing] = useState(false);

  const isUploading = uploadState.isUploading;
  const uploadProgress = uploadState.progress?.percentage || 0;

  // Calculate max width based on container
  const getMaxWidth = useCallback(() => {
    if (containerRef.current?.parentElement) {
      return containerRef.current.parentElement.offsetWidth - 32; // Account for padding
    }
    return 800;
  }, []);

  const handleFilesAccepted = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      // Validate it's an image
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      onSaveStatusChange?.("saving");

      const result = await uploadImage(file, siteId as Id<"sites">);

      if (result) {
        toast.success("Image uploaded");
        await onUpdate({
          ...content,
          url: result.url,
          width: result.width,
          height: result.height,
        });
        onSaveStatusChange?.("saved");
      } else if (uploadState.error) {
        toast.error(uploadState.error);
        onSaveStatusChange?.("idle");
      }
    },
    [
      siteId,
      uploadImage,
      uploadState.error,
      onUpdate,
      content,
      onSaveStatusChange,
    ],
  );

  const handleRemoveImage = useCallback(async () => {
    onSaveStatusChange?.("saving");
    await onUpdate({
      url: "",
      alt: "",
      caption: "",
    });
    setLocalAlt("");
    setLocalCaption("");
    onSaveStatusChange?.("saved");
  }, [onUpdate, onSaveStatusChange]);

  const handleSaveMeta = useCallback(async () => {
    onSaveStatusChange?.("saving");
    await onUpdate({
      ...content,
      alt: localAlt,
      caption: localCaption,
    });
    setIsEditingMeta(false);
    onSaveStatusChange?.("saved");
  }, [content, localAlt, localCaption, onUpdate, onSaveStatusChange]);

  const handleCancelMeta = useCallback(() => {
    setLocalAlt(content.alt || "");
    setLocalCaption(content.caption || "");
    setIsEditingMeta(false);
  }, [content.alt, content.caption]);

  const handleResizeStop = useCallback(
    async (
      _e: MouseEvent | TouchEvent,
      _direction: string,
      ref: HTMLElement,
    ) => {
      setIsResizing(false);
      const newWidth = ref.offsetWidth;
      const newHeight = ref.offsetHeight;

      onSaveStatusChange?.("saving");
      await onUpdate({
        ...content,
        width: newWidth,
        height: newHeight,
      });
      onSaveStatusChange?.("saved");
    },
    [content, onUpdate, onSaveStatusChange],
  );

  // Convert URL to proxy URL if needed
  const imageUrl = content.url ? toProxyDownloadUrl(content.url) : "";

  // No image - show upload zone
  if (!content.url) {
    return (
      <div ref={containerRef} className="rounded-md transition-colors">
        {isUploading ? (
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
            <p className="text-xs text-muted-foreground mt-1">
              {uploadProgress}%
            </p>
          </div>
        ) : (
          <DropZone
            onFilesAccepted={handleFilesAccepted}
            accept={{
              "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
            }}
            maxSize={10 * 1024 * 1024} // 10MB
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
        )}
      </div>
    );
  }

  // Has image - show preview with resize and edit controls
  return (
    <div
      ref={containerRef}
      className="rounded-md transition-colors group/editor relative"
    >
      <figure className="relative">
        {/* Resizable Image Container */}
        <Resizable
          size={{
            width: content.width || "auto",
            height: content.height || "auto",
          }}
          minWidth={100}
          minHeight={100}
          maxWidth={getMaxWidth()}
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
          onResizeStart={() => setIsResizing(true)}
          onResizeStop={handleResizeStop}
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
          {/* Image */}
          <img
            src={imageUrl}
            alt={content.alt || ""}
            className={cn(
              "w-full h-full rounded-lg",
              content.objectFit === "cover" && "object-cover",
              content.objectFit === "contain" && "object-contain",
              content.objectFit === "fill" && "object-fill",
              !content.objectFit && "object-cover",
            )}
            draggable={false}
          />

          {/* Overlay controls on hover (hidden while resizing) */}
          {!isResizing && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 rounded-lg">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length) handleFilesAccepted(files);
                  e.target.value = "";
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
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditingMeta(true)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveImage}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          )}
        </Resizable>

        {/* Caption display */}
        {content.caption && !isEditingMeta && (
          <figcaption className="mt-2 text-sm text-muted-foreground text-center">
            {content.caption}
          </figcaption>
        )}
      </figure>

      {/* Edit metadata panel */}
      {isEditingMeta && (
        <div className="mt-3 p-3 bg-muted/50 rounded-lg border space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-alt`} className="text-xs">
              Alt text
            </Label>
            <Input
              id={`${id}-alt`}
              value={localAlt}
              onChange={(e) => setLocalAlt(e.target.value)}
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
              value={localCaption}
              onChange={(e) => setLocalCaption(e.target.value)}
              placeholder="Optional caption to display below image"
              className="text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancelMeta}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveMeta}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
