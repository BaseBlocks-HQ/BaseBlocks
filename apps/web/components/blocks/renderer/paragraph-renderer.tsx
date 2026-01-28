import type { BlockRendererBaseProps } from "../types";
import type { ParagraphContent } from "@/types";

export function ParagraphRenderer({ block }: BlockRendererBaseProps) {
  const content = block.content as ParagraphContent;
  return <p className="mb-4 leading-relaxed">{content.text}</p>;
}
