import { toProxyDownloadUrl } from "@/lib/storage/client";
import { cn } from "@/lib/utils";
import type { ElementRendererProps } from "@/modules/elements/framework/registry";
import { ImageIcon } from "lucide-react";

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
  const imageUrl = toProxyDownloadUrl(content.url);

  // Determine if we have explicit dimensions from resizing
  const hasExplicitSize = content.width && content.height;
  const imageStyle = hasExplicitSize
    ? {
        width: `${content.width}px`,
        maxWidth: "100%",
        height: "auto",
      }
    : undefined;

  return (
    <figure className="my-6">
      <img
        src={imageUrl}
        alt={content.alt || ""}
        className={cn(
          "rounded-lg",
          !hasExplicitSize && "max-w-full",
          content.objectFit === "cover" && "object-cover",
          content.objectFit === "contain" && "object-contain",
          content.objectFit === "fill" && "object-fill",
          !content.objectFit && hasExplicitSize && "object-cover",
        )}
        style={imageStyle}
        loading="lazy"
      />
      {content.caption && (
        <figcaption className="mt-2 text-sm text-muted-foreground text-center">
          {content.caption}
        </figcaption>
      )}
    </figure>
  );
}
