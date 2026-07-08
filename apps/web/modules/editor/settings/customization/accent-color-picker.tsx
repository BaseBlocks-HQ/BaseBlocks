"use client";

import { cn } from "@/lib/utils";
import { COLOR_PRESETS } from "./presets";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
import { Check, ChevronDown, Info, Pipette } from "lucide-react";
import { useState } from "react";
import { isValidHex } from "./lib";

interface AccentColorPickerProps {
  value: string | undefined;
  onChange: (color: string | undefined) => void;
  label?: string;
  description?: string;
}

export function AccentColorPicker({
  value,
  onChange,
  label = "Accent Color",
  description,
}: AccentColorPickerProps) {
  const selectedPreset = value
    ? COLOR_PRESETS.find((p) => p.value.toLowerCase() === value.toLowerCase())
    : null;
  const [customColor, setCustomColor] = useState(() =>
    selectedPreset ? "" : (value ?? ""),
  );
  const [showCustomInput, setShowCustomInput] = useState(() =>
    Boolean(value && !selectedPreset),
  );

  const handlePresetClick = (preset: (typeof COLOR_PRESETS)[number]) => {
    onChange(preset.value);
    setShowCustomInput(false);
    setCustomColor("");
  };

  const handleClear = () => {
    onChange(undefined);
    setCustomColor("");
    setShowCustomInput(false);
  };

  const handleCustomColorChange = (newColor: string) => {
    setCustomColor(newColor);
    if (isValidHex(newColor)) {
      onChange(newColor);
    }
  };

  const handleOpenCustom = () => {
    setShowCustomInput(true);
  };

  // Display text
  const displayText = selectedPreset
    ? selectedPreset.label
    : value
      ? "Custom"
      : "Default";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
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
              {description}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

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
              {value ? (
                <div
                  className="w-4 h-4 rounded-full border"
                  style={{ backgroundColor: value }}
                />
              ) : (
                <div className="w-4 h-4 rounded-full border bg-gradient-to-br from-muted to-muted-foreground/20" />
              )}
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
            <div className="w-4 h-4 rounded-full border bg-gradient-to-br from-muted to-muted-foreground/20" />
            <span className="flex-1">Default</span>
            {!value && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Color presets */}
          {COLOR_PRESETS.map((preset) => {
            const isSelected =
              value?.toLowerCase() === preset.value.toLowerCase();
            return (
              <DropdownMenuItem
                key={preset.value}
                onClick={() => handlePresetClick(preset)}
              >
                <div
                  className="w-4 h-4 rounded-full border"
                  style={{ backgroundColor: preset.value }}
                />
                <span className="flex-1">{preset.label}</span>
                {isSelected && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator />

          {/* Custom color option */}
          <DropdownMenuItem onClick={handleOpenCustom}>
            <Pipette className="w-4 h-4" />
            <span className="flex-1">Custom color...</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Custom color input */}
      {showCustomInput && (
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-md border flex-shrink-0"
            style={{
              backgroundColor: isValidHex(customColor)
                ? customColor
                : "#cccccc",
            }}
          />
          <Input
            type="text"
            value={customColor}
            onChange={(e) => handleCustomColorChange(e.target.value)}
            placeholder="#0066FF"
            className={cn(
              "font-mono text-sm h-8",
              customColor && !isValidHex(customColor) && "border-destructive",
            )}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowCustomInput(false);
              if (!isValidHex(customColor)) {
                setCustomColor("");
              }
            }}
            className="h-8 px-2"
          >
            Done
          </Button>
        </div>
      )}
    </div>
  );
}
