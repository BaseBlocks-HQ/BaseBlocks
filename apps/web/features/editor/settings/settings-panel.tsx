"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@baseblocks/ui/collapsible";
import { Label } from "@baseblocks/ui/label";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
import { ChevronDown, Info } from "lucide-react";

const sectionSurfaceClassName =
  "overflow-hidden rounded-xl border border-border/70 bg-muted/5";

export function CollapsibleSettingsSection({
  title,
  children,
  contentClassName,
  defaultOpen = true,
  contentVariant = "framed",
}: {
  title: string;
  children: React.ReactNode;
  contentClassName?: string;
  defaultOpen?: boolean;
  contentVariant?: "framed" | "plain" | "stack";
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="group/collapsible">
      <section className="space-y-1">
        <CollapsibleTrigger
          type="button"
          className="flex w-full items-center gap-1.5 rounded-md px-0.5 py-1.5 text-left outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
              "-rotate-90 group-data-[state=open]/collapsible:rotate-0",
            )}
            aria-hidden
          />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent
          className={cn(
            contentVariant === "stack" && "flex flex-col gap-3",
            contentVariant !== "framed" && contentClassName,
          )}
        >
          {contentVariant === "framed" ? (
            <div
              className={cn(
                sectionSurfaceClassName,
                contentClassName ?? "divide-y divide-border/60",
              )}
            >
              {children}
            </div>
          ) : (
            children
          )}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

export function PanelSettingRow({
  control,
  htmlFor,
  label,
  tooltip,
}: {
  control: React.ReactNode;
  htmlFor?: string;
  label: string;
  tooltip: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 sm:py-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 pr-1">
        <Label className="text-sm font-medium leading-tight" htmlFor={htmlFor}>
          {label}
        </Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex shrink-0 rounded-sm text-muted-foreground/70 outline-offset-2 hover:text-foreground focus-visible:outline focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`About ${label}`}
            >
              <Info className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="max-w-[min(280px,calc(100vw-2rem))] text-pretty"
          >
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
