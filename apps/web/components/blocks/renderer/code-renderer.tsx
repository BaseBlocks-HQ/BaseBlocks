import type { BlockRendererBaseProps } from "../types";
import type { CodeContent } from "@/types";

export function CodeRenderer({ block }: BlockRendererBaseProps) {
  const content = block.content as CodeContent;
  return (
    <pre className="my-4 p-4 bg-zinc-950 text-zinc-100 rounded-lg overflow-x-auto">
      <code className="text-sm font-mono whitespace-pre-wrap">
        {content.text}
      </code>
    </pre>
  );
}
