import type { BlockRendererBaseProps } from "../types";
import type { ImageContent } from "@/types";

export function ImageRenderer({ block }: BlockRendererBaseProps) {
  const content = block.content as ImageContent;
  return (
    <figure className="my-6">
      <img
        src={content.url}
        alt={content.alt || ""}
        className="rounded-lg max-w-full"
      />
      {content.caption && (
        <figcaption className="mt-2 text-sm text-muted-foreground text-center">
          {content.caption}
        </figcaption>
      )}
    </figure>
  );
}
