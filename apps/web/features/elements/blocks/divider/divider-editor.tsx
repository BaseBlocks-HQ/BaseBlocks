"use client";

import type { ElementEditorProps } from "@/features/elements/registry";

export function DividerEditor(_props: ElementEditorProps<"divider">) {
  return (
    <div className="relative py-4 group">
      <hr className="border-border transition-colors group-hover:border-muted-foreground/50" />
    </div>
  );
}
