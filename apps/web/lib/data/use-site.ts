"use client";

import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { useQuery } from "convex/react";

/** Fetch a site by ID */
export function useSite(siteId: Id<"sites"> | string | undefined) {
  return useQuery(
    api.sites.queries.get,
    siteId ? { siteId: siteId as Id<"sites"> } : "skip",
  );
}

/** Fetch a site with its team data */
export function useSiteWithTeam(siteId: Id<"sites"> | string | undefined) {
  return useQuery(
    api.sites.queries.getWithTeam,
    siteId ? { siteId: siteId as Id<"sites"> } : "skip",
  );
}

/** Fetch all sites for the current user's team */
export function useSites() {
  return useQuery(api.sites.queries.list);
}
