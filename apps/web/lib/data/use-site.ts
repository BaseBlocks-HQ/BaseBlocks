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

export function useTeamSites(teamId: Id<"teams"> | string | undefined) {
  return useQuery(
    api.sites.queries.listByTeam,
    teamId ? { teamId: teamId as Id<"teams"> } : "skip",
  );
}
