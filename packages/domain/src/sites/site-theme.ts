export const siteThemePaletteIds = [
  "neutral",
  "amber",
  "blue",
  "green",
  "violet",
  "rose",
  "custom",
] as const;

export const siteThemeStyleIds = ["subtle", "tinted", "vibrant"] as const;
export const siteSidebarVariantIds = ["sidebar", "floating", "inset"] as const;

export type SiteThemePaletteId = (typeof siteThemePaletteIds)[number];
export type SiteThemeStyleId = (typeof siteThemeStyleIds)[number];
export type SiteSidebarVariant = (typeof siteSidebarVariantIds)[number];

export interface SiteThemeSettings {
  palette: SiteThemePaletteId;
  style: SiteThemeStyleId;
  /** A single author-provided brand color. Only used by the custom palette. */
  brandColor?: string;
}

export const DEFAULT_SITE_THEME = {
  palette: "neutral",
  style: "subtle",
} as const satisfies SiteThemeSettings;

export const DEFAULT_SITE_SIDEBAR_VARIANT =
  "sidebar" as const satisfies SiteSidebarVariant;

export const DEFAULT_CUSTOM_BRAND_COLOR = "#2563eb";

type Appearance = "light" | "dark";

type ThemeTokens = {
  accent: string;
  accentForeground: string;
  background: string;
  border: string;
  card: string;
  cardForeground: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  foreground: string;
  input: string;
  muted: string;
  mutedForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  ring: string;
  secondary: string;
  secondaryForeground: string;
  sidebar: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarRing: string;
};

type PaletteDefinition = { light: string; dark: string };

type SurfaceRole =
  | "accent"
  | "background"
  | "border"
  | "card"
  | "muted"
  | "sidebar";

const SURFACE_LIGHTNESS: Record<
  Appearance,
  Record<SiteThemeStyleId, Record<SurfaceRole, number>>
> = {
  light: {
    subtle: {
      background: 1,
      card: 0.98,
      muted: 0.96,
      accent: 0.94,
      border: 0.88,
      sidebar: 0.99,
    },
    tinted: {
      background: 0.97,
      card: 0.94,
      muted: 0.91,
      accent: 0.86,
      border: 0.78,
      sidebar: 0.96,
    },
    vibrant: {
      background: 0.92,
      card: 0.86,
      muted: 0.8,
      accent: 0.72,
      border: 0.64,
      sidebar: 0.89,
    },
  },
  dark: {
    subtle: {
      background: 0.04,
      card: 0.09,
      muted: 0.15,
      accent: 0.2,
      border: 0.22,
      sidebar: 0.07,
    },
    tinted: {
      background: 0.09,
      card: 0.14,
      muted: 0.2,
      accent: 0.27,
      border: 0.31,
      sidebar: 0.11,
    },
    vibrant: {
      background: 0.13,
      card: 0.2,
      muted: 0.27,
      accent: 0.36,
      border: 0.42,
      sidebar: 0.17,
    },
  },
};

const PALETTES: Record<
  Exclude<SiteThemePaletteId, "custom">,
  PaletteDefinition
> = {
  neutral: { light: "#171717", dark: "#f5f5f5" },
  amber: { light: "#b45309", dark: "#f59e0b" },
  blue: { light: "#2563eb", dark: "#60a5fa" },
  green: { light: "#15803d", dark: "#4ade80" },
  violet: { light: "#7c3aed", dark: "#a78bfa" },
  rose: { light: "#e11d48", dark: "#fb7185" },
};

const TOKEN_NAMES = [
  "accent",
  "accentForeground",
  "background",
  "border",
  "card",
  "cardForeground",
  "chart1",
  "chart2",
  "chart3",
  "chart4",
  "chart5",
  "foreground",
  "input",
  "muted",
  "mutedForeground",
  "popover",
  "popoverForeground",
  "primary",
  "primaryForeground",
  "ring",
  "secondary",
  "secondaryForeground",
  "sidebar",
  "sidebarAccent",
  "sidebarAccentForeground",
  "sidebarBorder",
  "sidebarForeground",
  "sidebarPrimary",
  "sidebarPrimaryForeground",
  "sidebarRing",
] as const satisfies readonly (keyof ThemeTokens)[];

export function isValidBrandColor(value: string): boolean {
  return normalizeHex(value) !== null;
}

export function normalizeBrandColor(value: string): string | null {
  return normalizeHex(value);
}

export function resolveSiteTheme(
  theme: SiteThemeSettings | undefined,
): SiteThemeSettings {
  if (!theme) return DEFAULT_SITE_THEME;

  const palette = siteThemePaletteIds.includes(theme.palette)
    ? theme.palette
    : DEFAULT_SITE_THEME.palette;
  const style = siteThemeStyleIds.includes(theme.style)
    ? theme.style
    : DEFAULT_SITE_THEME.style;
  const brandColor = theme.brandColor
    ? normalizeBrandColor(theme.brandColor)
    : null;

  return {
    palette,
    style,
    ...(palette === "custom" && brandColor ? { brandColor } : {}),
  };
}

/**
 * Returns staging variables for a scoped site theme. CSS maps these variables
 * to shadcn's semantic tokens and switches between light/dark automatically.
 */
export function getSiteThemeCssVariables(
  input: SiteThemeSettings | undefined,
): Record<`--site-${string}`, string> {
  const theme = resolveSiteTheme(input);
  const palette = getPalette(theme);
  const appearances: Record<Appearance, ThemeTokens> = {
    light: buildTokens(palette.light, "light", theme.style),
    dark: buildTokens(palette.dark, "dark", theme.style),
  };
  const variables: Record<`--site-${string}`, string> = {};

  for (const appearance of ["light", "dark"] as const) {
    for (const tokenName of TOKEN_NAMES) {
      variables[`--site-${appearance}-${toKebabCase(tokenName)}`] =
        appearances[appearance][tokenName];
    }
  }

  return variables;
}

export function getSiteThemePreviewColors(
  input: SiteThemeSettings | undefined,
): { background: string; card: string; primary: string } {
  const theme = resolveSiteTheme(input);
  const tokens = buildTokens(getPalette(theme).light, "light", theme.style);
  return {
    background: tokens.background,
    card: tokens.card,
    primary: tokens.primary,
  };
}

function getPalette(theme: SiteThemeSettings): PaletteDefinition {
  if (theme.palette !== "custom") return PALETTES[theme.palette];

  const light =
    normalizeBrandColor(theme.brandColor ?? "") ?? DEFAULT_CUSTOM_BRAND_COLOR;
  return {
    light: adaptBrandColor(light, "light"),
    dark: adaptBrandColor(light, "dark"),
  };
}

function buildTokens(
  brandColor: string,
  appearance: Appearance,
  style: SiteThemeStyleId,
): ThemeTokens {
  const dark = appearance === "dark";
  const foreground = dark ? "#fafafa" : "#171717";
  const mutedForeground = dark ? "#a3a3a3" : "#737373";
  const surface = (role: SurfaceRole) =>
    buildSurfaceColor(brandColor, appearance, style, role);
  const background = surface("background");
  const card = surface("card");
  const muted = surface("muted");
  const accent = surface("accent");
  const border = surface("border");
  const sidebar = surface("sidebar");
  const primary = adaptBrandColor(brandColor, appearance);
  const primaryForeground = readableForeground(primary);

  return {
    accent,
    accentForeground: readableForeground(accent),
    background,
    border,
    card,
    cardForeground: foreground,
    chart1: primary,
    chart2: mixHex(primary, dark ? "#ffffff" : "#000000", 0.18),
    chart3: mixHex(primary, dark ? "#ffffff" : "#000000", 0.34),
    chart4: mixHex(primary, dark ? "#000000" : "#ffffff", 0.22),
    chart5: mixHex(primary, dark ? "#000000" : "#ffffff", 0.4),
    foreground,
    input: border,
    muted,
    mutedForeground,
    popover: card,
    popoverForeground: foreground,
    primary,
    primaryForeground,
    ring: primary,
    secondary: muted,
    secondaryForeground: foreground,
    sidebar,
    sidebarAccent: accent,
    sidebarAccentForeground: readableForeground(accent),
    sidebarBorder: border,
    sidebarForeground: foreground,
    sidebarPrimary: primary,
    sidebarPrimaryForeground: primaryForeground,
    sidebarRing: primary,
  };
}

function buildSurfaceColor(
  brandColor: string,
  appearance: Appearance,
  style: SiteThemeStyleId,
  role: SurfaceRole,
): string {
  const hsl = rgbToHsl(parseHex(brandColor));
  const saturationFactor =
    style === "vibrant" ? 0.72 : style === "tinted" ? 0.45 : 0.14;

  return hslToHex({
    h: hsl.h,
    s: hsl.s * saturationFactor,
    l: SURFACE_LIGHTNESS[appearance][style][role],
  });
}

function adaptBrandColor(color: string, appearance: Appearance): string {
  let adapted = color;
  const hsl = rgbToHsl(parseHex(color));
  const threshold = appearance === "dark" ? 0.32 : 0.62;

  for (let step = 0; step < 12; step += 1) {
    const luminance = relativeLuminance(adapted);
    const acceptable =
      appearance === "dark" ? luminance >= threshold : luminance <= threshold;
    if (acceptable) return adapted;
    hsl.l = Math.min(
      1,
      Math.max(0, hsl.l + (appearance === "dark" ? 0.04 : -0.04)),
    );
    adapted = hslToHex(hsl);
  }

  return adapted;
}

function readableForeground(background: string): "#000000" | "#ffffff" {
  const luminance = relativeLuminance(background);
  const whiteContrast = 1.05 / (luminance + 0.05);
  const blackContrast = (luminance + 0.05) / 0.05;
  return whiteContrast >= blackContrast ? "#ffffff" : "#000000";
}

function normalizeHex(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(trimmed)) return trimmed;
  if (!/^#[0-9a-f]{3}$/.test(trimmed)) return null;
  return `#${trimmed
    .slice(1)
    .split("")
    .map((character) => `${character}${character}`)
    .join("")}`;
}

function mixHex(source: string, target: string, targetWeight: number): string {
  const sourceRgb = parseHex(source);
  const targetRgb = parseHex(target);
  const weight = Math.min(1, Math.max(0, targetWeight));
  const channel = (start: number, end: number) =>
    Math.round(start + (end - start) * weight)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(sourceRgb.r, targetRgb.r)}${channel(sourceRgb.g, targetRgb.g)}${channel(sourceRgb.b, targetRgb.b)}`;
}

function relativeLuminance(color: string): number {
  const { r, g, b } = parseHex(color);
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function parseHex(color: string) {
  return {
    r: Number.parseInt(color.slice(1, 3), 16),
    g: Number.parseInt(color.slice(3, 5), 16),
    b: Number.parseInt(color.slice(5, 7), 16),
  };
}

function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;
  let hue = 0;

  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return {
    h: hue,
    s: delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1)),
    l: lightness,
  };
}

function hslToHex({ h, s, l }: { h: number; s: number; l: number }) {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const segment = h / 60;
  const component = chroma * (1 - Math.abs((segment % 2) - 1));
  const [red, green, blue] =
    segment < 1
      ? [chroma, component, 0]
      : segment < 2
        ? [component, chroma, 0]
        : segment < 3
          ? [0, chroma, component]
          : segment < 4
            ? [0, component, chroma]
            : segment < 5
              ? [component, 0, chroma]
              : [chroma, 0, component];
  const match = l - chroma / 2;
  const channel = (value: number) =>
    Math.round((value + match) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(red)}${channel(green)}${channel(blue)}`;
}

function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}
