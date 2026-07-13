"use client";

import { Pipette } from "lucide-react";
import {
  type ComponentProps,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "./button";
import { Input } from "./input";
import { cn } from "./lib/utils";

type HsvColor = {
  hue: number;
  saturation: number;
  value: number;
};

type EyeDropperResult = { sRGBHex: string };
type EyeDropperInstance = { open: () => Promise<EyeDropperResult> };
type EyeDropperConstructor = new () => EyeDropperInstance;

type ColorPickerProps = Omit<ComponentProps<"div">, "onChange"> & {
  disabled?: boolean;
  onValueChange: (value: string) => void;
  value: string;
};

function ColorPicker({
  className,
  disabled = false,
  onValueChange,
  value,
  ...props
}: ColorPickerProps) {
  const normalizedValue = normalizeHex(value) ?? "#000000";
  const [color, setColor] = useState<HsvColor>(
    () => hexToHsv(normalizedValue) ?? { hue: 0, saturation: 0, value: 0 },
  );
  const [hexInput, setHexInput] = useState(normalizedValue);
  const [supportsEyeDropper, setSupportsEyeDropper] = useState(false);
  const isEditingHex = useRef(false);

  useEffect(() => {
    const nextColor = hexToHsv(normalizedValue);
    if (!nextColor) return;
    setColor((currentColor) =>
      hsvToHex(currentColor) === normalizedValue ? currentColor : nextColor,
    );
    if (!isEditingHex.current) setHexInput(normalizedValue);
  }, [normalizedValue]);

  useEffect(() => {
    setSupportsEyeDropper("EyeDropper" in window);
  }, []);

  const updateColor = (nextColor: HsvColor) => {
    const nextValue = hsvToHex(nextColor);
    setColor(nextColor);
    setHexInput(nextValue);
    if (nextValue !== normalizedValue) onValueChange(nextValue);
  };

  const commitHexInput = () => {
    const nextValue = normalizeHex(hexInput);
    if (!nextValue) {
      setHexInput(normalizedValue);
      return;
    }
    const nextColor = hexToHsv(nextValue);
    if (nextColor) updateColor(nextColor);
  };

  const pickFromScreen = async () => {
    const EyeDropper = (
      window as Window & { EyeDropper?: EyeDropperConstructor }
    ).EyeDropper;
    if (!EyeDropper) return;

    try {
      const result = await new EyeDropper().open();
      const nextColor = hexToHsv(result.sRGBHex);
      if (nextColor) updateColor(nextColor);
    } catch {
      // Closing the system eyedropper is an expected cancellation path.
    }
  };

  return (
    <div className={cn("space-y-3", className)} {...props}>
      <SaturationField
        color={color}
        disabled={disabled}
        onChange={updateColor}
      />

      <div className="flex items-center gap-2.5">
        <input
          aria-label="Color hue"
          className="h-3 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-[linear-gradient(to_right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)] disabled:cursor-not-allowed disabled:opacity-50 [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-sm [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm"
          disabled={disabled}
          max={360}
          min={0}
          onChange={(event) =>
            updateColor({ ...color, hue: Number(event.target.value) })
          }
          type="range"
          value={Math.round(color.hue)}
        />
        {supportsEyeDropper ? (
          <Button
            aria-label="Pick a color from the screen"
            className="size-8 text-muted-foreground"
            disabled={disabled}
            onClick={() => void pickFromScreen()}
            size="icon-sm"
            title="Pick a color from the screen"
            type="button"
            variant="outline"
          >
            <Pipette className="size-3.5" />
          </Button>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="size-8 shrink-0 rounded-md border border-black/10 shadow-xs dark:border-white/15"
          style={{ backgroundColor: normalizedValue }}
        />
        <Input
          aria-label="Hex color"
          aria-invalid={normalizeHex(hexInput) === null}
          className="h-8 font-mono text-xs uppercase"
          disabled={disabled}
          maxLength={7}
          onBlur={() => {
            isEditingHex.current = false;
            commitHexInput();
          }}
          onChange={(event) => setHexInput(event.target.value)}
          onFocus={() => {
            isEditingHex.current = true;
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitHexInput();
              event.currentTarget.blur();
            }
          }}
          placeholder="#2563EB"
          spellCheck={false}
          value={hexInput}
        />
      </div>
    </div>
  );
}

function SaturationField({
  color,
  disabled,
  onChange,
}: {
  color: HsvColor;
  disabled: boolean;
  onChange: (color: HsvColor) => void;
}) {
  const fieldRef = useRef<HTMLDivElement>(null);

  const updateFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = fieldRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const saturation = clamp((event.clientX - bounds.left) / bounds.width);
    const value = 1 - clamp((event.clientY - bounds.top) / bounds.height);
    onChange({ ...color, saturation, value });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.05 : 0.01;
    let nextColor = color;

    if (event.key === "ArrowLeft") {
      nextColor = { ...color, saturation: clamp(color.saturation - step) };
    } else if (event.key === "ArrowRight") {
      nextColor = { ...color, saturation: clamp(color.saturation + step) };
    } else if (event.key === "ArrowDown") {
      nextColor = { ...color, value: clamp(color.value - step) };
    } else if (event.key === "ArrowUp") {
      nextColor = { ...color, value: clamp(color.value + step) };
    } else {
      return;
    }

    event.preventDefault();
    onChange(nextColor);
  };

  return (
    <div
      aria-disabled={disabled}
      aria-label="Color saturation and brightness"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(color.saturation * 100)}
      aria-valuetext={`${Math.round(color.saturation * 100)}% saturation, ${Math.round(color.value * 100)}% brightness`}
      className={cn(
        "relative h-36 touch-none overflow-hidden rounded-lg border border-black/10 shadow-inner outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-white/15",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-crosshair",
      )}
      onKeyDown={disabled ? undefined : handleKeyDown}
      onPointerDown={(event) => {
        if (disabled) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        updateFromPointer(event);
      }}
      onPointerMove={(event) => {
        if (
          disabled ||
          !event.currentTarget.hasPointerCapture(event.pointerId)
        ) {
          return;
        }
        updateFromPointer(event);
      }}
      ref={fieldRef}
      role="slider"
      style={{
        backgroundColor: `hsl(${color.hue} 100% 50%)`,
        backgroundImage:
          "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
      }}
      tabIndex={disabled ? -1 : 0}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.55)]"
        style={{
          left: `${color.saturation * 100}%`,
          top: `${(1 - color.value) * 100}%`,
        }}
      />
    </div>
  );
}

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function normalizeHex(value: string): string | null {
  const match = value.trim().match(/^#?([0-9a-f]{6})$/i);
  return match?.[1] ? `#${match[1].toLowerCase()}` : null;
}

function hexToHsv(value: string): HsvColor | null {
  const hex = normalizeHex(value);
  if (!hex) return null;

  const red = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const green = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  let hue = 0;

  if (delta !== 0) {
    if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (maximum === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }

  if (hue < 0) hue += 360;

  return {
    hue,
    saturation: maximum === 0 ? 0 : delta / maximum,
    value: maximum,
  };
}

function hsvToHex({ hue, saturation, value }: HsvColor): string {
  const chroma = value * saturation;
  const section = hue / 60;
  const intermediate = chroma * (1 - Math.abs((section % 2) - 1));
  const offset = value - chroma;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (section < 1) [red, green] = [chroma, intermediate];
  else if (section < 2) [red, green] = [intermediate, chroma];
  else if (section < 3) [green, blue] = [chroma, intermediate];
  else if (section < 4) [green, blue] = [intermediate, chroma];
  else if (section < 5) [red, blue] = [intermediate, chroma];
  else [red, blue] = [chroma, intermediate];

  return `#${[red, green, blue]
    .map((channel) =>
      Math.round((channel + offset) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

export { ColorPicker };
export type { ColorPickerProps };
