"use client";

import type { SiteCustomization } from "@baseblocks/types/elements/customization";
import { cn } from "@baseblocks/ui/lib/utils";
import { hasCustomization } from "./lib";
import { useCustomizationStyles } from "./use-site-customization";

interface CustomizationPreviewProps {
  customization: SiteCustomization | undefined;
}

export function CustomizationPreview({
  customization,
}: CustomizationPreviewProps) {
  const cssVariables = useCustomizationStyles(customization);
  const customized = hasCustomization(customization);

  const accentHex = customization?.accentColor;
  const headerColor = customization?.headerColor;
  const secondaryColor = customization?.secondaryColor;
  const tertiaryColor = customization?.tertiaryColor;
  const showGradient = customization?.showHeaderGradient;

  const primaryForGradient = accentHex ?? "var(--primary)";
  const gradientStops = [primaryForGradient];
  if (tertiaryColor) gradientStops.push(tertiaryColor);
  if (secondaryColor) gradientStops.push(secondaryColor);
  const gradientStyle =
    gradientStops.length >= 2
      ? `linear-gradient(to right, ${gradientStops.join(", ")})`
      : (gradientStops[0] as string);

  return (
    <div
      className="overflow-hidden rounded-lg border bg-card"
      style={cssVariables}
      {...(customized ? { "data-site-customized": true } : {})}
    >
      {/* Header mockup — vector-style blocks, theme defaults when unset */}
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
        <div
          className="h-2.5 w-16 rounded-full"
          style={{
            backgroundColor: headerColor ? "currentColor" : undefined,
            opacity: headerColor ? 0.7 : undefined,
          }}
        >
          {!headerColor ? (
            <div className="h-full rounded-full bg-foreground/60" />
          ) : null}
        </div>
        <div className="ml-auto flex gap-1.5">
          <div
            className="h-2 w-8 rounded-full"
            style={{
              backgroundColor: headerColor ? "currentColor" : undefined,
              opacity: headerColor ? 0.4 : undefined,
            }}
          >
            {!headerColor ? (
              <div className="h-full rounded-full bg-foreground/30" />
            ) : null}
          </div>
          <div
            className="h-2 w-8 rounded-full"
            style={{
              backgroundColor: headerColor ? "currentColor" : undefined,
              opacity: headerColor ? 0.4 : undefined,
            }}
          >
            {!headerColor ? (
              <div className="h-full rounded-full bg-foreground/30" />
            ) : null}
          </div>
        </div>
      </div>

      {showGradient ? (
        <div className="h-1.5" style={{ background: gradientStyle }} />
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
