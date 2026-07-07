import type { BorderRadiusPreset } from "@baseblocks/domain/elements/customization";

export interface RadiusPresetInfo {
  value: BorderRadiusPreset;
  label: string;
  cssValue: string;
}

export const BORDER_RADIUS_PRESETS: RadiusPresetInfo[] = [
  { value: "none", label: "None", cssValue: "0rem" },
  { value: "small", label: "Small", cssValue: "0.25rem" },
  { value: "medium", label: "Medium", cssValue: "0.5rem" },
  { value: "large", label: "Large", cssValue: "0.75rem" },
  { value: "full", label: "Full", cssValue: "9999px" },
];

export interface ColorPreset {
  value: string;
  label: string;
  darkValue?: string;
}

export const COLOR_PRESETS: ColorPreset[] = [
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

export function getDarkColorForPreset(hex: string): string | undefined {
  return COLOR_PRESETS.find((p) => p.value.toLowerCase() === hex.toLowerCase())
    ?.darkValue;
}
