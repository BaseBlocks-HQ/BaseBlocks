"use client";

import { AppWindowIcon, Link02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

const iconCatalog = [
  { id: "link", label: "Link" },
  { id: "app", label: "App" },
] as const;

const safeUrl = (value: string, _context: "navigation" | "asset") => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:"
      ? trimmed
      : null;
  } catch {
    return null;
  }
};

export const createBaseBlocksCustomBlockHost = (
  authorizedAssetIds: Pick<ReadonlySet<string>, "has">,
  pickAsset?: () => Promise<{ id: string; kind: "raster"; alt: string } | null>,
) => ({
  resolveUrl: safeUrl,
  links: {
    resolve: ({ href: value, kind }: { href: string; kind?: string }) => {
      const href =
        kind === "app" &&
        /^[a-z][a-z\d+.-]*:\/\//i.test(value) &&
        !/^(?:javascript|data|vbscript):/i.test(value)
          ? value.trim()
          : safeUrl(value, "navigation");
      return href
        ? { href, external: kind !== "app" && !href.startsWith("/") }
        : null;
    },
  },
  assets: {
    pick: pickAsset,
    resolve: async (id: string) =>
      authorizedAssetIds.has(id) && /^[A-Za-z0-9_-]+$/.test(id)
        ? { src: `/api/files/${encodeURIComponent(id)}`, alt: "" }
        : null,
  },
  icons: {
    list: () => iconCatalog,
    render: (id: string) => (
      <HugeiconsIcon icon={id === "app" ? AppWindowIcon : Link02Icon} />
    ),
  },
});
