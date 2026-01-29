import type { CalloutContent } from "@/types";
import type { BlockRendererBaseProps } from "../types";

export function CalloutRenderer({ block }: BlockRendererBaseProps) {
  const content = block.content as CalloutContent;
  return <div className="my-4 p-4 bg-muted rounded-lg">{content.text}</div>;
}
