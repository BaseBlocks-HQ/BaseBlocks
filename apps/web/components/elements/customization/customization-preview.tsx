"use client";

import { Button } from "@/components/ui/button";
import { useCustomizationStyles } from "@/hooks";
import type { SiteCustomization } from "@/types/elements/customization";
import { hasCustomization } from "@/lib/customization";

interface CustomizationPreviewProps {
  customization: SiteCustomization | undefined;
}

export function CustomizationPreview({ customization }: CustomizationPreviewProps) {
  const cssVariables = useCustomizationStyles(customization);

  // Don't render if no customization is set
  if (!hasCustomization(customization)) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground font-medium">Preview</p>

      {/* Preview container with scoped customization */}
      <div
        className="p-4 rounded-lg border bg-card space-y-3"
        style={cssVariables}
        data-site-customized
      >
        {/* Button preview */}
        <div className="flex gap-2">
          <Button size="sm">Primary</Button>
          <Button size="sm" variant="outline">
            Outline
          </Button>
          <Button size="sm" variant="secondary">
            Secondary
          </Button>
        </div>

        {/* Card preview */}
        <div className="p-3 rounded-md border bg-background">
          <p className="text-sm font-medium">Sample Card</p>
          <p className="text-xs text-muted-foreground mt-1">
            This shows how content cards will look with your customization.
          </p>
        </div>

        {/* Link preview */}
        <p className="text-sm">
          Here is a{" "}
          <span className="text-primary underline cursor-pointer">
            sample link
          </span>{" "}
          in text.
        </p>
      </div>
    </div>
  );
}
