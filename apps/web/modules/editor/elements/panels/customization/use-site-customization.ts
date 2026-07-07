import { useSite } from "@/lib/data";
import type { Id } from "@baseblocks/backend";
import type { SiteCustomization } from "@baseblocks/types/elements/customization";
import type { CSSProperties } from "react";
import { generateCustomizationStyles, hasCustomization } from "./lib";

interface UseSiteCustomizationResult {
  /** CSS properties to apply to content wrapper */
  cssVariables: CSSProperties;
  /** Whether customization is applied */
  isCustomized: boolean;
  /** Raw customization data */
  customization: SiteCustomization | undefined;
  /** Loading state */
  isLoading: boolean;
}

/**
 * Hook to fetch and compute site customization CSS variables
 * Use this in content wrappers to scope customization to site content
 */
export function useSiteCustomization(
  siteId: Id<"sites"> | undefined,
): UseSiteCustomizationResult {
  const site = useSite(siteId);

  const customization = site?.settings?.customization as
    | SiteCustomization
    | undefined;

  const cssVariables = generateCustomizationStyles(customization);

  const isCustomized = hasCustomization(customization);

  return {
    cssVariables,
    isCustomized,
    customization,
    isLoading: site === undefined,
  };
}

/**
 * Hook variant that accepts customization directly (for preview purposes)
 */
export function useCustomizationStyles(
  customization: SiteCustomization | undefined,
): CSSProperties {
  return generateCustomizationStyles(customization);
}
