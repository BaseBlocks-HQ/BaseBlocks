export interface EditorSiteSwitcherSite {
  _id: string;
  isPublished: boolean;
  logoUrl?: string;
  name: string;
  slug: string;
}

export function getEditorSiteSwitcherSites(
  sites: EditorSiteSwitcherSite[],
  currentSiteId: string,
) {
  const sortedSites = [...sites].sort((left, right) =>
    left.name.localeCompare(right.name, undefined, {
      sensitivity: "base",
    }),
  );

  const currentSiteIndex = sortedSites.findIndex(
    (site) => site._id === currentSiteId,
  );

  if (currentSiteIndex <= 0) {
    return sortedSites;
  }

  const [currentSite] = sortedSites.splice(currentSiteIndex, 1);
  if (!currentSite) {
    return sortedSites;
  }

  return [currentSite, ...sortedSites];
}
