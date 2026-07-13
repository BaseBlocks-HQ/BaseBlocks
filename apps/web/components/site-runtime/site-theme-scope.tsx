"use client";

import type { SiteThemeSettings } from "@baseblocks/domain";
import { getSiteThemeCssVariables, resolveSiteTheme } from "@baseblocks/domain";
import { PortalContainerProvider } from "@baseblocks/ui/contexts/portal-container-context";
import { cn } from "@baseblocks/ui/lib/utils";
import { type CSSProperties, type ReactNode, useState } from "react";

export function SiteThemeScope({
  children,
  className,
  theme,
  withPortalContainer = false,
}: {
  children: ReactNode;
  className?: string;
  theme?: SiteThemeSettings;
  withPortalContainer?: boolean;
}) {
  const resolvedTheme = resolveSiteTheme(theme);
  const style = getSiteThemeCssVariables(resolvedTheme) as CSSProperties;
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null,
  );

  return (
    <div
      className={cn(
        "relative isolate bg-background text-foreground",
        className,
      )}
      data-site-palette={resolvedTheme.palette}
      data-site-theme=""
      data-site-theme-style={resolvedTheme.style}
      style={style}
    >
      {withPortalContainer ? (
        <div
          className="pointer-events-none fixed inset-0 z-50 [&>*]:pointer-events-auto"
          ref={setPortalContainer}
        />
      ) : null}
      {withPortalContainer ? (
        <PortalContainerProvider value={portalContainer ?? undefined}>
          {children}
        </PortalContainerProvider>
      ) : (
        children
      )}
    </div>
  );
}
