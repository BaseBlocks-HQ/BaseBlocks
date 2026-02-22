"use client";

import type { ReactNode } from "react";

interface MediaViewerLayoutProps {
  children: ReactNode;
}

/**
 * Simple passthrough layout - the actual viewer is rendered via MediaViewerOverlay
 */
export function MediaViewerLayout({ children }: MediaViewerLayoutProps) {
  return <>{children}</>;
}
