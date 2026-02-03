import { useMemo } from "react";
import type { CSSProperties } from "react";
import type { Id } from "@repo/backend";
import { useQuery } from "convex/react";
import { api } from "@repo/backend";
import {
  generateCustomizationStyles,
  hasCustomization,
} from "@/lib/customization";
import type { SiteCustomization } from "@/types/elements/customization";

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
  siteId: Id<"sites"> | undefined
): UseSiteCustomizationResult {
  const site = useQuery(
    api.sites.queries.get,
    siteId ? { siteId } : "skip"
  );

  const customization = site?.settings?.customization as SiteCustomization | undefined;

  const cssVariables = useMemo(() => {
    return generateCustomizationStyles(customization);
  }, [customization]);

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
  customization: SiteCustomization | undefined
): CSSProperties {
  return useMemo(() => {
    return generateCustomizationStyles(customization);
  }, [customization]);
}
