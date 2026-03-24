import { cn } from "@/lib/utils";
import type { ElementRendererProps } from "@/modules/elements/framework/registry";
import { ImageIcon } from "lucide-react";
import Image from "next/image";

export function ImageRenderer({ content }: ElementRendererProps<"image">) {
  // Handle empty state
  if (!content.url) {
    return (
      <div className="my-6 flex items-center justify-center py-12 px-4 border-2 border-dashed rounded-lg border-muted-foreground/25 bg-muted/20">
        <div className="flex flex-col items-center text-muted-foreground">
          <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">No image</p>
        </div>
      </div>
    );
  }

  // Convert URL to proxy URL if needed
  const imageUrl = content.url;

  // Determine if we have explicit dimensions from resizing
  const hasExplicitSize = content.width && content.height;
  const width = content.width || 1200;
  const height = content.height || 800;
  const imageStyle = hasExplicitSize
    ? {
        width: `${content.width}px`,
        maxWidth: "100%",
        height: "auto",
      }
    : { width: "100%", height: "auto" };

  return (
    <figure className="my-6">
      <Image
        src={imageUrl}
        alt={content.alt || ""}
        width={width}
        height={height}
        sizes={hasExplicitSize ? `${width}px` : "100vw"}
        unoptimized
        className={cn(
          "rounded-lg",
          !hasExplicitSize && "max-w-full",
          content.objectFit === "cover" && "object-cover",
          content.objectFit === "contain" && "object-contain",
          content.objectFit === "fill" && "object-fill",
          !content.objectFit && hasExplicitSize && "object-cover",
        )}
        style={imageStyle}
      />
      {content.caption && (
        <figcaption className="mt-2 text-sm text-muted-foreground text-center">
          {content.caption}
        </figcaption>
      )}
    </figure>
  );
}
