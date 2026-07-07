"use client";

import { cn } from "@baseblocks/ui/lib/utils";
import Image from "next/image";
import type { ElementPreviewProps } from "./registry";

const shouldOptimizePickerImages = process.env.NODE_ENV === "production";

export function themedPickerImagePreview(lightSrc: string, darkSrc: string) {
  function ThemedPickerImagePreview({ className }: ElementPreviewProps) {
    return (
      <div
        className={cn(
          "absolute inset-0 overflow-hidden rounded-[inherit]",
          className,
        )}
      >
        <Image
          src={lightSrc}
          alt=""
          fill
          className="object-cover object-center dark:hidden"
          sizes="(max-width: 768px) 90vw, 320px"
          unoptimized={!shouldOptimizePickerImages}
        />
        <Image
          src={darkSrc}
          alt=""
          fill
          className="hidden object-cover object-center dark:block"
          sizes="(max-width: 768px) 90vw, 320px"
          unoptimized={!shouldOptimizePickerImages}
        />
      </div>
    );
  }

  ThemedPickerImagePreview.displayName = "ThemedPickerImagePreview";
  return ThemedPickerImagePreview;
}
