"use client";

import type { ElementPreviewProps } from "@/components/elements/registry";
import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

interface ElementCardProps {
  label: string;
  icon: LucideIcon;
  preview?: ComponentType<ElementPreviewProps>;
  onClick: () => void;
}

export function ElementCard({
  label,
  icon: Icon,
  preview: Preview,
  onClick,
}: ElementCardProps) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col rounded-lg border bg-card overflow-hidden hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="aspect-[4/3] bg-muted/30 border-b flex items-center justify-center p-3">
        {Preview ? (
          <Preview className="w-full h-full" />
        ) : (
          <Icon className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <div className="p-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
      </div>
    </button>
  );
}
