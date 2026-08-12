"use client";

import { api, type Id } from "@baseblocks/backend";
import type { PageListItem } from "@baseblocks/domain";
import { useQueries, useQuery, type RequestForQueries } from "convex/react";
import { useMemo } from "react";

export type SiteNavigationItem = {
  _id: Id<"sites">;
  name: string;
  logoUrl?: string;
  logoFileId?: Id<"files">;
  defaultPageId?: Id<"pages">;
  updatedAt: number;
  pages: Array<PageListItem & { updatedAt: number }>;
};

/**
 * Builds the workspace navigation from the long-lived site and page queries.
 * Keeping the dynamic query set behind one hook gives callers a single loading
 * state without coupling the shell to a newly deployed aggregate function.
 */
export function useSiteNavigation(
  organizationId: string,
): SiteNavigationItem[] | undefined {
  const sites = useQuery(api.sites.listByTeam, { organizationId });
  const pageQueries = useMemo<RequestForQueries>(() => {
    if (!sites) return {};

    return Object.fromEntries(
      sites.map((site) => [
        site._id,
        { query: api.pages.list, args: { siteId: site._id } },
      ]),
    );
  }, [sites]);
  const pageResults = useQueries(pageQueries);

  if (sites === undefined) return undefined;

  const navigation: SiteNavigationItem[] = [];
  for (const site of sites) {
    const pages = pageResults[site._id];
    if (pages === undefined) return undefined;
    if (pages instanceof Error) throw pages;

    navigation.push({
      _id: site._id,
      name: site.name,
      logoUrl: site.logoUrl,
      logoFileId: site.logoFileId,
      defaultPageId: site.defaultPageId,
      updatedAt: site.updatedAt,
      pages: pages as Array<PageListItem & { updatedAt: number }>,
    });
  }

  return navigation;
}
