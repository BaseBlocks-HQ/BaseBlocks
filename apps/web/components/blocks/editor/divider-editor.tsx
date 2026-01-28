"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BlockEditorBaseProps } from "../types";

export function DividerEditor({ onRemove }: BlockEditorBaseProps) {
  return (
    <div className="group relative py-4">
      <hr className="border-border" />
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
