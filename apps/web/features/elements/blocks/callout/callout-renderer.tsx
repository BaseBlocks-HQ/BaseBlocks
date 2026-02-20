import type { ElementRendererProps } from "@/features/elements/registry";

export function CalloutRenderer({ content }: ElementRendererProps<"callout">) {
  return (
    <div className="my-4 p-4 bg-muted border border-primary/30 rounded-lg">
      {content.text}
    </div>
  );
}
