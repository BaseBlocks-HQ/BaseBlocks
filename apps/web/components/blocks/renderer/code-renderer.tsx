import type { CodeContent } from "@/types";
import type { BlockRendererBaseProps } from "../types";

export function CodeRenderer({ block }: BlockRendererBaseProps) {
  const content = block.content as CodeContent;
  return (
    <pre className="my-4 p-4 bg-zinc-950 dark:bg-muted rounded-lg overflow-x-auto">
      <code className="text-sm font-mono whitespace-pre-wrap text-zinc-100">
        {content.text}
      </code>
    </pre>
  );
}
