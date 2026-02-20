"use client";

import { cn } from "@/lib/utils";
import {
  BORDER_RADIUS_PRESETS,
  type BorderRadiusPreset,
} from "@baseblocks/types/elements/customization";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { Label } from "@baseblocks/ui/label";
import { Check, ChevronDown } from "lucide-react";

interface BorderRadiusPickerProps {
  value: BorderRadiusPreset | undefined;
  onChange: (radius: BorderRadiusPreset | undefined) => void;
}

export function BorderRadiusPicker({
  value,
  onChange,
}: BorderRadiusPickerProps) {
  const selectedPreset = value
    ? BORDER_RADIUS_PRESETS.find((p) => p.value === value)
    : null;

  const handleClear = () => {
    onChange(undefined);
  };

  const handleSelect = (preset: BorderRadiusPreset) => {
    onChange(preset);
  };

  // Display text
  const displayText = selectedPreset ? selectedPreset.label : "Default";

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Border Radius</Label>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full flex items-center justify-between h-9 px-3 rounded-md border text-sm",
              "bg-background hover:bg-accent transition-colors",
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 border-2 border-foreground/50 bg-muted/30"
                style={{
                  borderRadius: selectedPreset?.cssValue || "0.25rem",
                }}
              />
              <span>{displayText}</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)]"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {/* Default option */}
          <DropdownMenuItem onClick={handleClear}>
            <div
              className="w-4 h-4 border-2 border-foreground/50 bg-muted/30"
              style={{ borderRadius: "0.25rem" }}
            />
            <span className="flex-1">Default</span>
            {!value && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Radius presets */}
          {BORDER_RADIUS_PRESETS.map((preset) => {
            const isSelected = preset.value === value;
            return (
              <DropdownMenuItem
                key={preset.value}
                onClick={() => handleSelect(preset.value)}
              >
                <div
                  className="w-4 h-4 border-2 border-foreground/50 bg-muted/30"
                  style={{ borderRadius: preset.cssValue }}
                />
                <span className="flex-1">{preset.label}</span>
                {isSelected && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <p className="text-xs text-muted-foreground">
        {value
          ? "Applied to buttons, cards, and inputs"
          : "Using theme default radius"}
      </p>
    </div>
  );
}
