import type { ElementRendererProps } from "@/components/elements/registry";

export function CodeRenderer({ content }: ElementRendererProps<"code">) {
  return (
    <pre className="my-4 p-4 bg-zinc-950 dark:bg-muted rounded-lg overflow-x-auto">
      <code className="text-sm font-mono whitespace-pre-wrap text-zinc-100">
        {content.text}
      </code>
    </pre>
  );
}
