"use client";

import {
  DEFAULT_CUSTOM_BRAND_COLOR,
  isValidBrandColor,
  normalizeBrandColor,
} from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import { ColorPicker } from "@baseblocks/ui/color-picker";
import { Label } from "@baseblocks/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@baseblocks/ui/popover";
import { Spinner } from "@baseblocks/ui/spinner";

export function CustomBrandColor({
  color,
  disabled,
  inputId,
  onApply,
  onColorChange,
  onOpenChange,
  open,
}: {
  color: string;
  disabled: boolean;
  inputId: string;
  onApply: () => void;
  onColorChange: (color: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const normalizedColor =
    normalizeBrandColor(color) ?? DEFAULT_CUSTOM_BRAND_COLOR;

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label htmlFor={inputId}>Custom brand color</Label>
      <Popover onOpenChange={onOpenChange} open={open}>
        <PopoverTrigger asChild>
          <Button
            className="h-10 w-full justify-start px-3 font-normal"
            disabled={disabled}
            id={inputId}
            type="button"
            variant="outline"
          >
            <span
              aria-hidden
              className="size-5 rounded-md border border-black/10 shadow-xs dark:border-white/15"
              style={{ backgroundColor: normalizedColor }}
            />
            <span className="font-mono text-xs uppercase">
              {normalizedColor}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 space-y-3 p-3">
          <ColorPicker
            disabled={disabled}
            onValueChange={onColorChange}
            value={normalizedColor}
          />
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button
              disabled={disabled}
              onClick={() => onOpenChange(false)}
              size="sm"
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              disabled={disabled || !isValidBrandColor(color)}
              onClick={onApply}
              size="sm"
              type="button"
            >
              {disabled ? <Spinner /> : null}
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
