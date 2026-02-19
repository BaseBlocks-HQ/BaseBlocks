"use client";

import { useCustomizationStyles } from "@/hooks";
import { hasCustomization } from "@/lib/customization";
import type { SiteCustomization } from "@repo/types/elements/customization";

interface CustomizationPreviewProps {
  customization: SiteCustomization | undefined;
}

export function CustomizationPreview({
  customization,
}: CustomizationPreviewProps) {
  const cssVariables = useCustomizationStyles(customization);

  // Don't render if no customization is set
  if (!hasCustomization(customization)) {
    return null;
  }

  const primaryColor = customization?.accentColor || "#0066FF";
  const headerColor = customization?.headerColor;
  const secondaryColor = customization?.secondaryColor;
  const tertiaryColor = customization?.tertiaryColor;
  const showGradient = customization?.showHeaderGradient;

  // Build gradient: primary → tertiary → secondary
  const gradientStops = [primaryColor];
  if (tertiaryColor) gradientStops.push(tertiaryColor);
  if (secondaryColor) gradientStops.push(secondaryColor);
  const gradientStyle =
    gradientStops.length >= 2
      ? `linear-gradient(to right, ${gradientStops.join(", ")})`
      : primaryColor;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-medium">Preview</p>

      {/* Mini-mockup preview */}
      <div
        className="rounded-lg border overflow-hidden bg-card"
        style={cssVariables}
        data-site-customized
      >
        {/* Header mockup */}
        <div
          className="px-3 py-2 flex items-center gap-2 border-b"
          style={{
            backgroundColor: headerColor || undefined,
            color: headerColor ? "var(--site-header-fg)" : undefined,
          }}
        >
          {/* Logo dot */}
          <div
            className="w-5 h-5 rounded-md flex-shrink-0"
            style={{ backgroundColor: primaryColor }}
          />
          {/* Site name placeholder */}
          <div
            className="h-2.5 rounded-full w-16"
            style={{
              backgroundColor: headerColor ? "currentColor" : undefined,
              opacity: headerColor ? 0.7 : undefined,
            }}
          >
            {!headerColor && (
              <div className="h-full rounded-full bg-foreground/60" />
            )}
          </div>
          {/* Nav items placeholder */}
          <div className="flex gap-1.5 ml-auto">
            <div
              className="h-2 rounded-full w-8"
              style={{
                backgroundColor: headerColor ? "currentColor" : undefined,
                opacity: headerColor ? 0.4 : undefined,
              }}
            >
              {!headerColor && (
                <div className="h-full rounded-full bg-foreground/30" />
              )}
            </div>
            <div
              className="h-2 rounded-full w-8"
              style={{
                backgroundColor: headerColor ? "currentColor" : undefined,
                opacity: headerColor ? 0.4 : undefined,
              }}
            >
              {!headerColor && (
                <div className="h-full rounded-full bg-foreground/30" />
              )}
            </div>
          </div>
        </div>

        {/* Gradient stripe (below header) */}
        {showGradient && (
          <div className="h-1.5" style={{ background: gradientStyle }} />
        )}

        {/* Content area mockup */}
        <div className="p-3 space-y-2">
          {/* Content lines */}
          <div className="flex gap-2">
            <div className="h-2 rounded-full bg-foreground/15 flex-1" />
            <div className="h-2 rounded-full bg-foreground/10 w-8" />
          </div>
          <div className="h-2 rounded-full bg-foreground/10 w-3/4" />

          {/* Primary-colored elements */}
          <div className="flex gap-2 pt-1">
            <div
              className="h-5 rounded-md px-3 flex items-center"
              style={{ backgroundColor: primaryColor }}
            >
              <span
                className="text-[8px] font-medium"
                style={{ color: "var(--primary-foreground, #fff)" }}
              >
                Button
              </span>
            </div>
            {secondaryColor && (
              <div
                className="h-5 rounded-md px-3 flex items-center border"
                style={{ borderColor: secondaryColor }}
              >
                <span
                  className="text-[8px] font-medium"
                  style={{ color: secondaryColor }}
                >
                  Accent
                </span>
              </div>
            )}
          </div>

          {/* Link text */}
          <div className="flex items-center gap-1">
            <div className="h-2 rounded-full bg-foreground/10 w-12" />
            <div
              className="h-2 rounded-full w-10"
              style={{ backgroundColor: primaryColor, opacity: 0.6 }}
            />
            <div className="h-2 rounded-full bg-foreground/10 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}
