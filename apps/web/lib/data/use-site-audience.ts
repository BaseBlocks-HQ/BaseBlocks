"use client";

import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { useQuery } from "convex/react";

export function useSiteAudiences(siteId: Id<"sites"> | string | undefined) {
  return useQuery(
    api.siteAudiences.queries.list,
    siteId ? { siteId: siteId as Id<"sites"> } : "skip",
  );
}

export function useAudienceMemberAssignments(
  audienceId: Id<"siteAudiences"> | string | undefined,
) {
  return useQuery(
    api.siteAudiences.queries.getMemberAssignments,
    audienceId ? { audienceId: audienceId as Id<"siteAudiences"> } : "skip",
  );
}
