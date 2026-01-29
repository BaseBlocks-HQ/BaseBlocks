"use client";

import type { BlockEditorBaseProps } from "../types";

export function DividerEditor(_props: BlockEditorBaseProps) {
  return (
    <div className="relative py-4 group">
      <hr className="border-border transition-colors group-hover:border-muted-foreground/50" />
    </div>
  );
}
