import { cn } from "@/lib/utils";
import type { ElementRendererProps } from "@/modules/site-runtime/rendering";

export function HeadingRenderer({ content }: ElementRendererProps<"heading">) {
  const level = content.level || 2;

  switch (level) {
    case 1:
      return (
        <h1 className="text-3xl font-semibold mt-6 mb-4">{content.text}</h1>
      );
    case 2:
      return (
        <h2 className="text-2xl font-semibold mt-6 mb-4">{content.text}</h2>
      );
    case 3:
      return (
        <h3 className="text-xl font-semibold mt-6 mb-4">{content.text}</h3>
      );
    case 4:
      return (
        <h4 className="text-lg font-semibold mt-6 mb-4">{content.text}</h4>
      );
    default:
      return <h5 className="font-semibold mt-6 mb-4">{content.text}</h5>;
  }
}

export function ParagraphRenderer({
  content,
}: ElementRendererProps<"paragraph">) {
  return <p className="mb-4 leading-relaxed">{content.text}</p>;
}

export function CalloutRenderer({ content }: ElementRendererProps<"callout">) {
  return (
    <div className="my-4 bg-muted rounded-lg p-4">
      <p className="whitespace-pre-wrap text-foreground">{content.text}</p>
    </div>
  );
}

export function DividerRenderer(_props: ElementRendererProps<"divider">) {
  return <hr className="my-8" />;
}

const RENDERER_HEIGHTS = {
  small: "h-8",
  medium: "h-16",
  large: "h-24",
  xlarge: "h-32",
} as const;

export function SpacerRenderer({
  content,
}: ElementRendererProps<"block-spacer">) {
  const height = content.height || "medium";
  return (
    <div
      className={cn("w-full", RENDERER_HEIGHTS[height])}
      aria-hidden="true"
    />
  );
}
