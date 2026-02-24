"use client";

import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { useQuery } from "convex/react";

export function useSite(siteId: Id<"sites"> | string | undefined) {
  return useQuery(
    api.sites.queries.get,
    siteId ? { siteId: siteId as Id<"sites"> } : "skip",
  );
}

export function useSiteWithTeam(siteId: Id<"sites"> | string | undefined) {
  return useQuery(
    api.sites.queries.getWithTeam,
    siteId ? { siteId: siteId as Id<"sites"> } : "skip",
  );
}

export function useSites() {
  return useQuery(api.sites.queries.list);
}
