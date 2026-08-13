export type QuickLink = {
  id: string;
  title: string;
  url: string;
  artwork?: { kind: "icon"; id: string } | { kind: "asset"; assetId: string };
  linkType: "website" | "app";
};

export function duplicateQuickLink(link: QuickLink, id: string): QuickLink {
  return {
    ...link,
    id,
    title: `${link.title} copy`,
    artwork: link.artwork ? { ...link.artwork } : undefined,
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
  if (link.linkType === "app") {
    return /^[a-z][a-z\d+.-]*:\/\//i.test(url) &&
      !/^(?:javascript|data|vbscript):/i.test(url)
      ? url
      : null;
  }
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
  if (link.linkType === "app") return "Open app";
  if (link.url.startsWith("/")) return "BaseBlocks page";
  try {
    return new URL(link.url).hostname.replace(/^www\./, "");
  } catch {
    return "Website";
  }
}
