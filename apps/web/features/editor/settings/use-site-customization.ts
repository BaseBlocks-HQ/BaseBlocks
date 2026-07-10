import {
  generateCustomizationStyles,
  hasCustomization,
  useCustomizationStyles,
} from "@/components/site-runtime/customization";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type { SiteCustomization } from "@baseblocks/domain/site-settings";
import { useQuery } from "convex/react";
import type { CSSProperties } from "react";

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
  const site = useQuery(api.sites.get, siteId ? { siteId } : "skip");

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

export { useCustomizationStyles };
