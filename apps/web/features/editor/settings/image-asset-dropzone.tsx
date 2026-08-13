"use client";

import { DropZone } from "@/components/file-viewer/file-ui";
import { Button } from "@baseblocks/ui/button";
import { Spinner } from "@baseblocks/ui/spinner";
import { Delete01Icon, Image01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";

export function ImageAssetDropZone({
  alt,
  isRemoving = false,
  isUploading,
  onFileAccepted,
  onRemove,
  progress,
  src,
}: {
  alt: string;
  isRemoving?: boolean;
  isUploading: boolean;
  onFileAccepted: (file: File) => void;
  onRemove?: () => void;
  progress?: number;
  src?: string;
}) {
  return (
    <DropZone
      accept={{
        "image/*": [".ico", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
      }}
      className="group flex h-20 w-28 items-center justify-center overflow-hidden border bg-background transition-[border-color,background-color] focus-within:ring-2 focus-within:ring-ring/50"
      disabled={isUploading || isRemoving}
      inputAriaLabel={src ? `Replace ${alt}` : `Upload ${alt}`}
      maxSize={5 * 1024 * 1024}
      multiple={false}
      onFilesAccepted={(files) => {
        const file = files[0];
        if (file) onFileAccepted(file);
      }}
    >
      {isUploading || isRemoving ? (
        <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
          <Spinner className="size-4" />
          {isUploading ? (
            <span className="text-xs tabular-nums">{progress ?? 0}%</span>
          ) : null}
        </div>
      ) : src ? (
        <div className="relative size-full p-2">
          <Image
            alt={alt}
            className="size-full object-contain"
            height={64}
            src={src}
            unoptimized
            width={96}
          />
          <span className="absolute inset-x-0 bottom-0 bg-background/90 py-1 text-center text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            Replace
          </span>
          {onRemove ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label={`Remove ${alt}`}
                  className="absolute top-1 end-1 size-7 bg-background/90 text-muted-foreground opacity-100 shadow-sm transition-opacity group-focus-within:opacity-100 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onRemove();
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                >
                  <HugeiconsIcon aria-hidden icon={Delete01Icon} />
                </Button>
              </TooltipTrigger>
              <TooltipContent sideOffset={6}>Remove</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      ) : (
        <HugeiconsIcon
          aria-hidden
          className="size-5 text-muted-foreground"
          icon={Image01Icon}
        />
      )}
    </DropZone>
  );
}
