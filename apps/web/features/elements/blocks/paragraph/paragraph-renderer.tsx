import type { ElementRendererProps } from "@/features/elements/registry";

export function ParagraphRenderer({
  content,
}: ElementRendererProps<"paragraph">) {
  return <p className="mb-4 leading-relaxed">{content.text}</p>;
}
