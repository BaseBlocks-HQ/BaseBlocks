"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidHex } from "@/lib/customization";
import { cn } from "@/lib/utils";
import { COLOR_PRESETS } from "@/types/elements/customization";
import { Check, ChevronDown, Pipette } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [customColor, setCustomColor] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Find if current value matches a preset
  const selectedPreset = value
    ? COLOR_PRESETS.find((p) => p.value.toLowerCase() === value.toLowerCase())
    : null;

  // Sync custom color input with external value changes
  useEffect(() => {
    if (value && !selectedPreset) {
      setCustomColor(value);
      setShowCustomInput(true);
    } else if (!value) {
      setCustomColor("");
      setShowCustomInput(false);
    }
  }, [value, selectedPreset]);

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
      <Label className="text-sm font-medium">{label}</Label>

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

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
