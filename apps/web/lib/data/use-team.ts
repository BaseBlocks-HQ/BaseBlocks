"use client";

import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { useQuery } from "convex/react";

/** Fetch the current user's team */
export function useTeam() {
  return useQuery(api.teams.queries.getMine);
}

/** Fetch members for a team */
export function useMembers(teamId: Id<"teams"> | undefined) {
  return useQuery(api.members.queries.list, teamId ? { teamId } : "skip");
}

/** Fetch the current user's role in a team */
export function useMemberRole(teamId: Id<"teams"> | undefined) {
  return useQuery(api.members.queries.getMyRole, teamId ? { teamId } : "skip");
}
