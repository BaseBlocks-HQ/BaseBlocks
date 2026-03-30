"use client";

import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { useQuery } from "convex/react";

export function useMembers(teamId: Id<"teams"> | undefined) {
  return useQuery(api.members.queries.list, teamId ? { teamId } : "skip");
}
