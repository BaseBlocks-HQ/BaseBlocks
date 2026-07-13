import "server-only";

import type { Metadata } from "next";
import type { PublishedPageResult } from "./read-model";

export function buildPublicSiteFaviconMetadata(
  result: PublishedPageResult | null,
): Metadata {
  const favicon = result?.site.settings.favicon;
  return favicon ? { icons: { icon: favicon, apple: favicon } } : {};
}
