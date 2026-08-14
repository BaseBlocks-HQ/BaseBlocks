export type QuickLink = {
  id: string;
  title: string;
  url: string;
  imageAssetId?: string;
};

export type QuickLinksData = { links: QuickLink[] };

export function parseQuickLinksData(value: unknown): QuickLinksData {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Quick Links data must be an object.");
  const rawLinks = (value as { links?: unknown }).links;
  if (!Array.isArray(rawLinks))
    throw new Error("Quick Links must contain a links array.");
  const ids = new Set<string>();
  const links = rawLinks.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item))
      throw new Error("Each Quick Link must be an object.");
    const link = item as Record<string, unknown>;
    if (typeof link.id !== "string" || !link.id)
      throw new Error("Each Quick Link needs an ID.");
    if (ids.has(link.id)) throw new Error("Quick Link IDs must be unique.");
    ids.add(link.id);
    if (typeof link.title !== "string")
      throw new Error("Each Quick Link needs a title.");
    if (typeof link.url !== "string")
      throw new Error("Each Quick Link needs a destination.");
    if (
      link.imageAssetId !== undefined &&
      (typeof link.imageAssetId !== "string" ||
        !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(link.imageAssetId))
    )
      throw new Error("Quick Link image is invalid.");
    const parsed: QuickLink = {
      id: link.id,
      title: link.title,
      url: link.url,
      ...(typeof link.imageAssetId === "string"
        ? { imageAssetId: link.imageAssetId }
        : {}),
    };
    if (!safeQuickLinkHref(parsed))
      throw new Error("Quick Links contains an unsafe destination.");
    return parsed;
  });
  return { links };
}

export function duplicateQuickLink(link: QuickLink, id: string): QuickLink {
  return {
    ...link,
    id,
    title: `${link.title} copy`,
  };
}

export function moveQuickLink(
  links: readonly QuickLink[],
  linkId: string,
  direction: -1 | 1,
): QuickLink[] {
  const index = links.findIndex(({ id }) => id === linkId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= links.length)
    return links as QuickLink[];
  const next = [...links];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

export function updateQuickLink(
  links: readonly QuickLink[],
  value: QuickLink,
): QuickLink[] {
  return links.map((link) => (link.id === value.id ? value : link));
}

export function safeQuickLinkHref(link: QuickLink): string | null {
  const url = link.url.trim();
  if (!url) return null;
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? url
      : null;
  } catch {
    return null;
  }
}

export function destinationLabel(link: QuickLink): string {
  if (link.url.startsWith("/")) return "BaseBlocks page";
  try {
    return new URL(link.url).hostname.replace(/^www\./, "");
  } catch {
    return "Website";
  }
}
