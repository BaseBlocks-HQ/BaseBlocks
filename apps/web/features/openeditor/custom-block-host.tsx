"use client";

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
    resolve: ({ href: value }: { href: string; kind?: string }) => {
      const href = safeUrl(value, "navigation");
      return href ? { href, external: !href.startsWith("/") } : null;
    },
  },
  assets: {
    pick: pickAsset,
    resolve: async (id: string) =>
      authorizedAssetIds.has(id) && /^[A-Za-z0-9_-]+$/.test(id)
        ? { src: `/api/files/${encodeURIComponent(id)}`, alt: "" }
        : null,
  },
});
