"use client";

import { Button } from "@baseblocks/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
import { ChevronsUpDown, Rows3 } from "lucide-react";

interface TabsModeToggleProps {
  mode: "row" | "dropdown";
  horizontalLabel: string;
  dropdownLabel: string;
  onChange: (mode: "row" | "dropdown") => void;
}

export function TabsModeToggle({
  mode,
  horizontalLabel,
  dropdownLabel,
  onChange,
}: TabsModeToggleProps) {
  const nextMode = mode === "row" ? "dropdown" : "row";
  const label = nextMode === "row" ? horizontalLabel : dropdownLabel;
  const Icon = nextMode === "row" ? Rows3 : ChevronsUpDown;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          className="text-muted-foreground hover:text-foreground"
          onClick={() => onChange(nextMode)}
        >
          <Icon className="size-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  );
}
