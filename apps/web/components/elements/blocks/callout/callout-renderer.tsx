import type { ElementRendererProps } from "@/components/elements/registry";

export function CalloutRenderer({ content }: ElementRendererProps<"callout">) {
  return <div className="my-4 p-4 bg-muted rounded-lg">{content.text}</div>;
}
