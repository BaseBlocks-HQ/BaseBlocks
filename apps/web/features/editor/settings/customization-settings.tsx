"use client";

import { cn } from "@baseblocks/ui/lib/utils";
import { hasCustomization } from "@/components/site-runtime/customization";
import {
  CollapsibleSettingsSection,
  PanelSettingRow,
} from "@/features/editor/settings/settings-panel";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type {
  BorderRadiusPreset,
  SiteCustomization,
} from "@baseblocks/domain/site-settings";
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
import { Switch } from "@baseblocks/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
import { useMutation, useQuery } from "convex/react";
import { Check, ChevronDown, Info, Loader2, Pipette } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCustomizationStyles } from "./use-site-customization";

interface CustomizationConfigPanelProps {
  siteId: Id<"sites">;
}

const COLOR_PRESETS = [
  { value: "#022364", label: "Navy", darkValue: "#1E4D8C" },
  { value: "#D20567", label: "Magenta", darkValue: "#E84A93" },
  { value: "#0066FF", label: "Blue", darkValue: "#3B82F6" },
  { value: "#8B5CF6", label: "Purple", darkValue: "#A78BFA" },
  { value: "#EC4899", label: "Pink", darkValue: "#F472B6" },
  { value: "#EF4444", label: "Red", darkValue: "#F87171" },
  { value: "#F97316", label: "Orange", darkValue: "#FB923C" },
  { value: "#EAB308", label: "Yellow", darkValue: "#FACC15" },
  { value: "#22C55E", label: "Green", darkValue: "#4ADE80" },
  { value: "#14B8A6", label: "Teal", darkValue: "#2DD4BF" },
  { value: "#64748B", label: "Slate", darkValue: "#94A3B8" },
];

const BORDER_RADIUS_PRESETS: Array<{
  value: BorderRadiusPreset;
  label: string;
  cssValue: string;
}> = [
  { value: "none", label: "None", cssValue: "0rem" },
  { value: "small", label: "Small", cssValue: "0.25rem" },
  { value: "medium", label: "Medium", cssValue: "0.5rem" },
  { value: "large", label: "Large", cssValue: "0.75rem" },
  { value: "full", label: "Full", cssValue: "9999px" },
];

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: Number.parseInt(result[1]!, 16),
    g: Number.parseInt(result[2]!, 16),
    b: Number.parseInt(result[3]!, 16),
  };
}

function isValidHex(hex: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

function lightenColor(hex: string, amount = 0.2) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const lighten = (value: number) =>
    Math.min(255, Math.round(value + (255 - value) * amount));

  return `#${lighten(rgb.r).toString(16).padStart(2, "0")}${lighten(rgb.g)
    .toString(16)
    .padStart(2, "0")}${lighten(rgb.b).toString(16).padStart(2, "0")}`;
}

function getDarkColorForPreset(hex: string) {
  return COLOR_PRESETS.find(
    (preset) => preset.value.toLowerCase() === hex.toLowerCase(),
  )?.darkValue;
}

export function CustomizationConfigPanel({
  siteId,
}: CustomizationConfigPanelProps) {
  const site = useQuery(api.sites.get, { siteId });
  const updateSite = useMutation(api.sites.update);
  const [isSaving, setIsSaving] = useState(false);

  const customization = site?.settings?.customization as
    | SiteCustomization
    | undefined;

  const saveCustomization = async (newCustomization: SiteCustomization) => {
    if (!site) return;

    setIsSaving(true);
    try {
      await updateSite({
        siteId,
        settings: {
          customization: structuredClone(newCustomization),
        },
      });
    } catch (_error) {
      toast.error("Failed to update customization");
    } finally {
      setIsSaving(false);
    }
  };

  const handleColorChange =
    (
      field: "accentColor" | "headerColor" | "secondaryColor" | "tertiaryColor",
    ) =>
    async (color: string | undefined) => {
      if (!site) return;

      const darkField = `${field}Dark` as const;
      const newCustomization = { ...customization };

      if (color) {
        const darkColor =
          getDarkColorForPreset(color) || lightenColor(color, 0.2);
        (newCustomization as Record<string, unknown>)[field] = color;
        (newCustomization as Record<string, unknown>)[darkField] = darkColor;
      } else {
        delete (newCustomization as Record<string, unknown>)[field];
        delete (newCustomization as Record<string, unknown>)[darkField];
      }

      await saveCustomization(newCustomization);
    };

  const handleBorderRadiusChange = async (
    radius: BorderRadiusPreset | undefined,
  ) => {
    if (!site) return;
    await saveCustomization({ ...customization, borderRadius: radius });
  };

  const handleGradientToggle = async (checked: boolean) => {
    if (!site) return;
    await saveCustomization({
      ...customization,
      showHeaderGradient: checked ? true : undefined,
    });
  };

  if (!site) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">Customization</h3>
        {isSaving ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      <CollapsibleSettingsSection
        title="Preview"
        contentClassName="pt-2"
        contentVariant="plain"
      >
        <CustomizationPreview customization={customization} />
      </CollapsibleSettingsSection>

      <CollapsibleSettingsSection title="Colors" contentClassName="p-3">
        <div className="space-y-4">
          <ColorPicker
            value={customization?.accentColor}
            onChange={handleColorChange("accentColor")}
            label="Primary Color"
            description="Buttons, links, and focus states across the public site."
          />
          <ColorPicker
            value={customization?.headerColor}
            onChange={handleColorChange("headerColor")}
            label="Header Color"
            description="Background of the site header and navigation bar."
          />
          <ColorPicker
            value={customization?.secondaryColor}
            onChange={handleColorChange("secondaryColor")}
            label="Secondary Color"
            description="Used for gradient accents and supporting UI highlights."
          />
          <ColorPicker
            value={customization?.tertiaryColor}
            onChange={handleColorChange("tertiaryColor")}
            label="Tertiary Color"
            description="Middle tone when a three-color header gradient is shown."
          />
        </div>
      </CollapsibleSettingsSection>

      <CollapsibleSettingsSection
        title="Shape and Effects"
        contentClassName="p-3"
      >
        <div className="space-y-4">
          <PanelSettingRow
            htmlFor="header-gradient"
            label="Header Gradient"
            tooltip="Adds a subtle gradient stripe along the header for extra depth."
            control={
              <Switch
                id="header-gradient"
                checked={customization?.showHeaderGradient ?? false}
                onCheckedChange={handleGradientToggle}
              />
            }
          />

          <BorderRadiusPicker
            value={customization?.borderRadius}
            onChange={handleBorderRadiusChange}
          />
        </div>
      </CollapsibleSettingsSection>
    </div>
  );
}

function ColorPicker({
  value,
  onChange,
  label,
  description,
}: {
  value: string | undefined;
  onChange: (color: string | undefined) => void;
  label: string;
  description: string;
}) {
  const selectedPreset = value
    ? COLOR_PRESETS.find(
        (preset) => preset.value.toLowerCase() === value.toLowerCase(),
      )
    : null;
  const [customColor, setCustomColor] = useState(() =>
    selectedPreset ? "" : (value ?? ""),
  );
  const [showCustomInput, setShowCustomInput] = useState(() =>
    Boolean(value && !selectedPreset),
  );
  const displayText = selectedPreset
    ? selectedPreset.label
    : value
      ? "Custom"
      : "Default";

  return (
    <div className="space-y-3">
      <SettingLabel label={label} description={description} />

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-md border px-3 text-sm",
              "bg-background transition-colors hover:bg-accent",
            )}
          >
            <div className="flex items-center gap-2">
              <ColorSwatch color={value} />
              <span>{displayText}</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)]"
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <DropdownMenuItem
            onClick={() => {
              onChange(undefined);
              setCustomColor("");
              setShowCustomInput(false);
            }}
          >
            <ColorSwatch />
            <span className="flex-1">Default</span>
            {!value ? <Check className="h-4 w-4 text-primary" /> : null}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {COLOR_PRESETS.map((preset) => {
            const isSelected =
              value?.toLowerCase() === preset.value.toLowerCase();
            return (
              <DropdownMenuItem
                key={preset.value}
                onClick={() => {
                  onChange(preset.value);
                  setShowCustomInput(false);
                  setCustomColor("");
                }}
              >
                <ColorSwatch color={preset.value} />
                <span className="flex-1">{preset.label}</span>
                {isSelected ? <Check className="h-4 w-4 text-primary" /> : null}
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowCustomInput(true)}>
            <Pipette className="h-4 w-4" />
            <span className="flex-1">Custom color...</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showCustomInput ? (
        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 shrink-0 rounded-md border"
            style={{
              backgroundColor: isValidHex(customColor)
                ? customColor
                : "#cccccc",
            }}
          />
          <Input
            type="text"
            value={customColor}
            onChange={(event) => {
              const nextColor = event.target.value;
              setCustomColor(nextColor);
              if (isValidHex(nextColor)) onChange(nextColor);
            }}
            placeholder="#0066FF"
            className={cn(
              "h-8 font-mono text-sm",
              customColor && !isValidHex(customColor) && "border-destructive",
            )}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowCustomInput(false);
              if (!isValidHex(customColor)) setCustomColor("");
            }}
            className="h-8 px-2"
          >
            Done
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function BorderRadiusPicker({
  value,
  onChange,
}: {
  value: BorderRadiusPreset | undefined;
  onChange: (radius: BorderRadiusPreset | undefined) => void;
}) {
  const selectedPreset = value
    ? BORDER_RADIUS_PRESETS.find((preset) => preset.value === value)
    : null;

  return (
    <div className="space-y-3">
      <SettingLabel
        label="Border Radius"
        description="Controls corner rounding on buttons, cards, and inputs. Default follows the theme until you pick a preset."
      />

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-md border px-3 text-sm",
              "bg-background transition-colors hover:bg-accent",
            )}
          >
            <div className="flex items-center gap-2">
              <RadiusSwatch radius={selectedPreset?.cssValue ?? "0.25rem"} />
              <span>{selectedPreset?.label ?? "Default"}</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[var(--radix-dropdown-menu-trigger-width)]"
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <DropdownMenuItem onClick={() => onChange(undefined)}>
            <RadiusSwatch radius="0.25rem" />
            <span className="flex-1">Default</span>
            {!value ? <Check className="h-4 w-4 text-primary" /> : null}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {BORDER_RADIUS_PRESETS.map((preset) => (
            <DropdownMenuItem
              key={preset.value}
              onClick={() => onChange(preset.value)}
            >
              <RadiusSwatch radius={preset.cssValue} />
              <span className="flex-1">{preset.label}</span>
              {preset.value === value ? (
                <Check className="h-4 w-4 text-primary" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SettingLabel({
  description,
  label,
}: {
  description: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-sm font-medium">{label}</Label>
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
    </div>
  );
}

function ColorSwatch({ color }: { color?: string }) {
  return color ? (
    <span
      className="h-4 w-4 rounded-full border"
      style={{ backgroundColor: color }}
    />
  ) : (
    <span className="h-4 w-4 rounded-full border bg-gradient-to-br from-muted to-muted-foreground/20" />
  );
}

function RadiusSwatch({ radius }: { radius: string }) {
  return (
    <span
      className="h-4 w-4 border-2 border-foreground/50 bg-muted/30"
      style={{ borderRadius: radius }}
    />
  );
}

function CustomizationPreview({
  customization,
}: {
  customization: SiteCustomization | undefined;
}) {
  const cssVariables = useCustomizationStyles(customization);
  const customized = hasCustomization(customization);

  const accentHex = customization?.accentColor;
  const headerColor = customization?.headerColor;
  const secondaryColor = customization?.secondaryColor;
  const tertiaryColor = customization?.tertiaryColor;
  const gradientStops = [accentHex ?? "var(--primary)"];
  if (tertiaryColor) gradientStops.push(tertiaryColor);
  if (secondaryColor) gradientStops.push(secondaryColor);

  return (
    <div
      style={cssVariables}
      {...(customized ? { "data-site-customized": true } : {})}
    >
      <div
        className="flex items-center gap-2 border-b px-3 py-2"
        style={{
          backgroundColor: headerColor || undefined,
          color: headerColor ? "var(--site-header-fg)" : undefined,
        }}
      >
        <div
          className={cn(
            "h-5 w-5 shrink-0 rounded-md",
            !accentHex && "bg-primary",
          )}
          style={accentHex ? { backgroundColor: accentHex } : undefined}
        />
        <PreviewBar active={Boolean(headerColor)} className="w-16" />
        <div className="ml-auto flex gap-1.5">
          <PreviewBar
            active={Boolean(headerColor)}
            className="w-8 opacity-40"
          />
          <PreviewBar
            active={Boolean(headerColor)}
            className="w-8 opacity-40"
          />
        </div>
      </div>

      {customization?.showHeaderGradient ? (
        <div
          className="h-1.5"
          style={{
            background: `linear-gradient(to right, ${gradientStops.join(", ")})`,
          }}
        />
      ) : null}

      <div className="space-y-2 p-3">
        <div className="flex gap-2">
          <div className="h-2 flex-1 rounded-full bg-foreground/15" />
          <div className="h-2 w-8 rounded-full bg-foreground/10" />
        </div>
        <div className="h-2 w-3/4 rounded-full bg-foreground/10" />

        <div className="flex gap-2 pt-1">
          <div
            className={cn(
              "flex h-5 items-center rounded-md px-3",
              !accentHex && "bg-primary text-primary-foreground",
            )}
            style={accentHex ? { backgroundColor: accentHex } : undefined}
          >
            <span
              className={cn(
                "font-medium text-[8px]",
                !accentHex && "text-primary-foreground",
              )}
              style={
                accentHex
                  ? { color: "var(--primary-foreground, #fff)" }
                  : undefined
              }
            >
              Button
            </span>
          </div>
          {secondaryColor ? (
            <div
              className="flex h-5 items-center rounded-md border px-3"
              style={{ borderColor: secondaryColor }}
            >
              <span
                className="font-medium text-[8px]"
                style={{ color: secondaryColor }}
              >
                Accent
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          <div className="h-2 w-12 rounded-full bg-foreground/10" />
          <div
            className={cn(
              "h-2 w-10 rounded-full",
              !accentHex && "bg-primary/60",
            )}
            style={
              accentHex
                ? { backgroundColor: accentHex, opacity: 0.6 }
                : undefined
            }
          />
          <div className="h-2 w-16 rounded-full bg-foreground/10" />
        </div>
      </div>
    </div>
  );
}

function PreviewBar({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  return active ? (
    <div className={cn("h-2 rounded-full bg-current opacity-70", className)} />
  ) : (
    <div className={cn("h-2 rounded-full bg-foreground/30", className)} />
  );
}
