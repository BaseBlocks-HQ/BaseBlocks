"use client";

import { cn } from "@baseblocks/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import type { ComponentType } from "react";

const elementCardOuterClassName =
  "relative w-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all";
const elementCardButtonClassName =
  "flex w-full flex-col rounded-[inherit] bg-transparent p-0 text-left outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const elementCardPreviewClassName =
  "relative min-h-[120px] w-full overflow-hidden rounded-lg bg-muted/35 ring-1 ring-border/25 dark:bg-muted/25 dark:ring-border/40";

interface ElementCardProps {
  label: string;
  icon: LucideIcon;
  preview?: ComponentType<{ className?: string }>;
  onClick: () => void;
  isSelected?: boolean;
}

export function ElementCard({
  label,
  icon: Icon,
  preview: Preview,
  onClick,
  isSelected,
}: ElementCardProps) {
  return (
    <div
      className={cn(
        elementCardOuterClassName,
        !isSelected && "hover:border-border hover:shadow-md",
      )}
    >
      <button
        type="button"
        aria-label={label}
        aria-pressed={isSelected === undefined ? undefined : isSelected}
        className={elementCardButtonClassName}
        onClick={onClick}
      >
        <div className={cn(elementCardPreviewClassName, "aspect-[7/4]")}>
          <div className="absolute inset-0">
            {Preview ? (
              <Preview className="h-full w-full" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Icon className="h-8 w-8 text-muted-foreground/80" />
              </div>
            )}
          </div>
          {isSelected ? (
            <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow-sm">
              <Check className="h-3 w-3 text-primary-foreground" />
            </div>
          ) : null}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t from-background/95 via-background/55 to-transparent px-2 pb-1.5 pt-7">
            <span className="min-w-0 flex-1 truncate text-[11px] font-medium leading-tight text-foreground/95">
              {label}
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}
