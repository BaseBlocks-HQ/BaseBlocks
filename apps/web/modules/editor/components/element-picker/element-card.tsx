"use client";

import { cn } from "@baseblocks/ui/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
import type { LucideIcon } from "lucide-react";
import { Check, Info } from "lucide-react";
import type { ComponentType } from "react";

interface ElementCardProps {
  label: string;
  description?: string;
  icon: LucideIcon;
  preview?: ComponentType<{ className?: string }>;
  onClick: () => void;
  isSelected?: boolean;
}

export function ElementCard({
  label,
  description,
  icon: Icon,
  preview: Preview,
  onClick,
  isSelected,
}: ElementCardProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all",
        isSelected
          ? "border-primary ring-2 ring-primary/15"
          : "hover:border-border hover:shadow-md",
      )}
    >
      <button
        type="button"
        aria-label={label}
        aria-pressed={isSelected === undefined ? undefined : isSelected}
        className="flex w-full flex-col rounded-xl bg-transparent p-0 text-left outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onClick={onClick}
      >
        <div className="p-2.5">
          <div
            className={cn(
              "relative w-full min-h-[120px] overflow-hidden rounded-md bg-muted/35 ring-1 ring-border/25 dark:bg-muted/25 dark:ring-border/40",
              "aspect-[7/4]",
            )}
          >
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
            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t from-background/95 via-background/55 to-transparent px-2 pb-1.5 pt-7",
                description ? "pr-8" : undefined,
              )}
            >
              <span className="min-w-0 flex-1 truncate text-[11px] font-medium leading-tight text-foreground/95">
                {label}
              </span>
            </div>
          </div>
        </div>
      </button>

      {description ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="absolute bottom-2.5 right-2.5 z-20 inline-flex size-6 items-center justify-center rounded-md bg-background/90 text-muted-foreground shadow-sm ring-1 ring-border/60 backdrop-blur-sm hover:text-foreground focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`About ${label}`}
            >
              <Info className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="left"
            className="max-w-[min(260px,calc(100vw-2rem))] text-pretty"
          >
            {description}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
