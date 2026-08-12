"use client";

import {
  productPaletteIds,
  useProductAppearance,
  type ProductPaletteId,
} from "@/components/product-theme-provider";
import {
  getSiteThemePreviewColors,
  siteThemeStyleIds,
  type SiteThemeStyleId,
} from "@baseblocks/domain";
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { PaintBoardIcon, Tick01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

export function AppSidebarAppearanceMenu() {
  const t = useTranslations();
  const { setTheme, theme, resolvedTheme } = useTheme();
  const {
    palette: productPalette,
    setPalette: setProductPalette,
    setStyle: setProductStyle,
    style: productStyle,
  } = useProductAppearance();
  const themeSummary =
    theme === "system"
      ? t("common.themeSystem")
      : resolvedTheme === "dark"
        ? t("common.themeDark")
        : t("common.themeLight");
  const paletteLabels: Record<ProductPaletteId, string> = {
    neutral: t("common.themeNeutral"),
    amber: t("common.themeAmber"),
    blue: t("common.themeBlue"),
    green: t("common.themeGreen"),
    violet: t("common.themeViolet"),
    rose: t("common.themeRose"),
  };
  const styleLabels: Record<SiteThemeStyleId, string> = {
    subtle: t("common.themeSubtle"),
    tinted: t("common.themeTinted"),
    vibrant: t("common.themeVibrant"),
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="w-full gap-2">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <HugeiconsIcon
            className="h-4 w-4 shrink-0 text-muted-foreground"
            icon={PaintBoardIcon}
          />
          <span>{t("common.themeMenu")}</span>
        </span>
        <span className="w-[7rem] shrink-0 truncate text-right text-xs text-muted-foreground">
          {paletteLabels[productPalette]}
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span className="flex-1">{t("common.themeMode")}</span>
            <span className="text-xs text-muted-foreground">
              {themeSummary}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {(["light", "dark", "system"] as const).map((value) => (
              <DropdownMenuItem key={value} onClick={() => setTheme(value)}>
                {value === "light"
                  ? t("common.themeLight")
                  : value === "dark"
                    ? t("common.themeDark")
                    : t("common.themeSystem")}
                {theme === value ? (
                  <HugeiconsIcon
                    icon={Tick01Icon}
                    className="ml-auto size-4 text-muted-foreground"
                  />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span className="flex-1">{t("common.themeColor")}</span>
            <span className="text-xs text-muted-foreground">
              {paletteLabels[productPalette]}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {productPaletteIds.map((palette) => (
              <DropdownMenuItem
                key={palette}
                onClick={() => setProductPalette(palette)}
              >
                <ProductPaletteIndicator
                  palette={palette}
                  style={productStyle}
                />
                {paletteLabels[palette]}
                {productPalette === palette ? (
                  <HugeiconsIcon
                    icon={Tick01Icon}
                    className="ml-auto size-4 text-muted-foreground"
                  />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <span className="flex-1">{t("common.themeStyle")}</span>
            <span className="text-xs text-muted-foreground">
              {styleLabels[productStyle]}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {siteThemeStyleIds.map((style) => (
              <DropdownMenuItem
                key={style}
                onClick={() => setProductStyle(style)}
              >
                {styleLabels[style]}
                {productStyle === style ? (
                  <HugeiconsIcon
                    icon={Tick01Icon}
                    className="ml-auto size-4 text-muted-foreground"
                  />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

function ProductPaletteIndicator({
  palette,
  style,
}: {
  palette: ProductPaletteId;
  style: SiteThemeStyleId;
}) {
  const colors = getSiteThemePreviewColors({ palette, style });
  return (
    <span
      aria-hidden
      className="size-3.5 rounded-full border border-black/10 shadow-xs dark:border-white/15"
      style={{ backgroundColor: colors.primary }}
    />
  );
}
