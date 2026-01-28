"use client";

import type { BlockEditorBaseProps } from "../types";

export function DividerEditor(_props: BlockEditorBaseProps) {
  return (
    <div className="relative py-4">
      <hr className="border-border" />
    </div>
  );
}
