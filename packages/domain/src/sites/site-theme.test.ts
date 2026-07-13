import { describe, expect, test } from "bun:test";
import {
  DEFAULT_SITE_THEME,
  getSiteThemeCssVariables,
  normalizeBrandColor,
  resolveSiteTheme,
} from "./site-theme";

describe("site theme", () => {
  test("normalizes supported hex formats", () => {
    expect(normalizeBrandColor(" #0AF ")).toBe("#00aaff");
    expect(normalizeBrandColor("#12abEF")).toBe("#12abef");
    expect(normalizeBrandColor("blue")).toBeNull();
  });

  test("uses the neutral subtle theme by default", () => {
    expect(resolveSiteTheme(undefined)).toEqual(DEFAULT_SITE_THEME);
  });

  test("generates complete light and dark semantic staging variables", () => {
    const variables = getSiteThemeCssVariables({
      palette: "custom",
      style: "tinted",
      brandColor: "#0057b8",
    });

    expect(variables["--site-light-primary"]).toMatch(/^#[0-9a-f]{6}$/);
    expect(variables["--site-dark-primary"]).toMatch(/^#[0-9a-f]{6}$/);
    expect(variables["--site-light-primary-foreground"]).toMatch(
      /^#(?:000000|ffffff)$/,
    );
    expect(variables["--site-dark-primary-foreground"]).toMatch(
      /^#(?:000000|ffffff)$/,
    );
    expect(variables["--site-light-sidebar"]).toBeDefined();
    expect(variables["--site-dark-sidebar"]).toBeDefined();
  });

  test("adapts extreme custom colors for both appearances", () => {
    const black = getSiteThemeCssVariables({
      palette: "custom",
      style: "subtle",
      brandColor: "#000000",
    });
    const white = getSiteThemeCssVariables({
      palette: "custom",
      style: "subtle",
      brandColor: "#ffffff",
    });

    expect(black["--site-dark-primary"]).not.toBe("#000000");
    expect(white["--site-light-primary"]).not.toBe("#ffffff");
  });

  test("preserves the hue of a deep custom brand color", () => {
    const variables = getSiteThemeCssVariables({
      palette: "custom",
      style: "vibrant",
      brandColor: "#032169",
    });
    const lightBackground = readRgb(variables["--site-light-background"]!);
    const darkBackground = readRgb(variables["--site-dark-background"]!);

    expect(lightBackground.b - lightBackground.r).toBeGreaterThan(20);
    expect(darkBackground.b - darkBackground.r).toBeGreaterThan(20);
  });
});

function readRgb(color: string) {
  return {
    r: Number.parseInt(color.slice(1, 3), 16),
    g: Number.parseInt(color.slice(3, 5), 16),
    b: Number.parseInt(color.slice(5, 7), 16),
  };
}
