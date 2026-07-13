"use client";

import {
  DEFAULT_SITE_THEME,
  getSiteThemeCssVariables,
  resolveSiteTheme,
  siteThemePaletteIds,
  siteThemeStyleIds,
  type SiteThemePaletteId,
  type SiteThemeStyleId,
} from "@baseblocks/domain";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import {
  createContext,
  type ComponentProps,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ProductPaletteId = Exclude<SiteThemePaletteId, "custom">;

export const productPaletteIds = siteThemePaletteIds.filter(
  (palette): palette is ProductPaletteId => palette !== "custom",
);

const paletteStorageKey = "baseblocks-product-palette";
const styleStorageKey = "baseblocks-product-style";
const paletteAttribute = "data-product-palette";
const styleAttribute = "data-product-style";
const productThemeAttribute = "data-product-theme";
const productThemeCssText = buildProductThemeCss();

type ProductAppearanceContextValue = {
  palette: ProductPaletteId;
  setPalette: (palette: ProductPaletteId) => void;
  setStyle: (style: SiteThemeStyleId) => void;
  style: SiteThemeStyleId;
};

const ProductAppearanceContext =
  createContext<ProductAppearanceContextValue | null>(null);

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  const [appearance, setAppearance] = useState<{
    palette: ProductPaletteId;
    style: SiteThemeStyleId;
  }>({
    palette: DEFAULT_SITE_THEME.palette,
    style: DEFAULT_SITE_THEME.style,
  });
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    setAppearance(readStoredAppearance());
    setPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    applyProductAppearance(appearance);
    try {
      window.localStorage.setItem(paletteStorageKey, appearance.palette);
      window.localStorage.setItem(styleStorageKey, appearance.style);
    } catch {}
  }, [appearance, preferencesLoaded]);

  const contextValue = useMemo<ProductAppearanceContextValue>(
    () => ({
      palette: appearance.palette,
      setPalette: (palette) =>
        setAppearance((current) => ({ ...current, palette })),
      setStyle: (style) => setAppearance((current) => ({ ...current, style })),
      style: appearance.style,
    }),
    [appearance.palette, appearance.style],
  );

  return (
    <ProductAppearanceContext.Provider value={contextValue}>
      <style>{productThemeCssText}</style>
      <script id="baseblocks-product-appearance">
        {productAppearanceScript}
      </script>
      <NextThemesProvider {...props}>{children}</NextThemesProvider>
    </ProductAppearanceContext.Provider>
  );
}

export function useProductAppearance() {
  const context = useContext(ProductAppearanceContext);
  if (!context) {
    throw new Error(
      "useProductAppearance must be used within the ThemeProvider",
    );
  }
  return context;
}

function buildProductThemeCss(): string {
  return productPaletteIds
    .flatMap((palette) =>
      siteThemeStyleIds.map((style) => {
        const variables = getSiteThemeCssVariables({ palette, style });
        return [
          `:root[${paletteAttribute}="${palette}"][${styleAttribute}="${style}"] {`,
          ...Object.entries(variables).map(
            ([property, value]) => `  ${property}: ${value};`,
          ),
          "}",
        ].join("\n");
      }),
    )
    .join("\n");
}

function applyProductAppearance(appearance: {
  palette: ProductPaletteId;
  style: SiteThemeStyleId;
}) {
  const root = document.documentElement;
  root.setAttribute(productThemeAttribute, "");
  root.setAttribute(paletteAttribute, appearance.palette);
  root.setAttribute(styleAttribute, appearance.style);
}

function readStoredAppearance(): {
  palette: ProductPaletteId;
  style: SiteThemeStyleId;
} {
  const root = document.documentElement;
  const attributePalette = root.getAttribute(paletteAttribute);
  const attributeStyle = root.getAttribute(styleAttribute);
  let storedPalette: string | null = null;
  let storedStyle: string | null = null;

  try {
    storedPalette = window.localStorage.getItem(paletteStorageKey);
    storedStyle = window.localStorage.getItem(styleStorageKey);
  } catch {}

  const paletteValue = attributePalette ?? storedPalette;
  const styleValue = attributeStyle ?? storedStyle;
  const resolved = resolveSiteTheme({
    palette: productPaletteIds.includes(paletteValue as ProductPaletteId)
      ? (paletteValue as ProductPaletteId)
      : DEFAULT_SITE_THEME.palette,
    style: siteThemeStyleIds.includes(styleValue as SiteThemeStyleId)
      ? (styleValue as SiteThemeStyleId)
      : DEFAULT_SITE_THEME.style,
  });

  return {
    palette: resolved.palette as ProductPaletteId,
    style: resolved.style,
  };
}

const productAppearanceScript = `try{var p=localStorage.getItem(${JSON.stringify(
  paletteStorageKey,
)});var s=localStorage.getItem(${JSON.stringify(
  styleStorageKey,
)});var ps=${JSON.stringify(productPaletteIds)};var ss=${JSON.stringify(
  siteThemeStyleIds,
)};document.documentElement.setAttribute(${JSON.stringify(
  productThemeAttribute,
)},"");document.documentElement.setAttribute(${JSON.stringify(
  paletteAttribute,
)},ps.includes(p)?p:${JSON.stringify(
  DEFAULT_SITE_THEME.palette,
)});document.documentElement.setAttribute(${JSON.stringify(
  styleAttribute,
)},ss.includes(s)?s:${JSON.stringify(
  DEFAULT_SITE_THEME.style,
)});}catch(_){document.documentElement.setAttribute(${JSON.stringify(
  productThemeAttribute,
)},"");document.documentElement.setAttribute(${JSON.stringify(
  paletteAttribute,
)},${JSON.stringify(
  DEFAULT_SITE_THEME.palette,
)});document.documentElement.setAttribute(${JSON.stringify(
  styleAttribute,
)},${JSON.stringify(DEFAULT_SITE_THEME.style)});}`;
