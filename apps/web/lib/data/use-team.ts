"use client";

import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { useQuery } from "convex/react";

export function useTeam(teamId?: Id<"teams">) {
  return useQuery(api.teams.queries.getMine, teamId ? { teamId } : {});
}

export function useMembers(teamId: Id<"teams"> | undefined) {
  return useQuery(api.members.queries.list, teamId ? { teamId } : "skip");
}

export function useMemberRole(teamId: Id<"teams"> | undefined) {
  return useQuery(api.members.queries.getMyRole, teamId ? { teamId } : "skip");
}
