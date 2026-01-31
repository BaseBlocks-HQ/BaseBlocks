import type { ElementRendererProps } from "@/components/elements/registry";

export function ImageRenderer({ content }: ElementRendererProps<"image">) {
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
