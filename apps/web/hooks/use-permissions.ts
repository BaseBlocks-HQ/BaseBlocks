"use client";

import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { useQuery } from "convex/react";

interface UsePermissionsOptions {
  teamId?: Id<"teams">;
}

interface PermissionsResult {
  isLoading: boolean;
  isAdmin: boolean;
  isViewer: boolean;
  isMember: boolean;
  canEdit: boolean;
  canView: boolean;
  role: "admin" | "viewer" | null;
}

/**
 * Hook to check user permissions for a team
 *
 * Usage:
 * ```tsx
 * const { canEdit, isAdmin, isLoading } = usePermissions({ teamId });
 *
 * if (isLoading) return <Spinner />;
 * if (!canEdit) return <ViewOnlyBanner />;
 * ```
 */
export function usePermissions({
  teamId,
}: UsePermissionsOptions): PermissionsResult {
  const myRole = useQuery(
    api.members.queries.getMyRole,
    teamId ? { teamId } : "skip",
  );

  const isLoading = myRole === undefined;
  const role = myRole?.role ?? null;
  const isAdmin = role === "admin";
  const isViewer = role === "viewer";
  const isMember = role !== null;

  return {
    isLoading,
    isAdmin,
    isViewer,
    isMember,
    canEdit: isAdmin,
    canView: isMember,
    role,
  };
}

/**
 * Hook to get permissions for a site
 * Automatically fetches the team from the site
 */
export function useSitePermissions(siteId?: Id<"sites">): PermissionsResult & {
  teamId?: Id<"teams">;
} {
  const site = useQuery(api.sites.queries.get, siteId ? { siteId } : "skip");

  const teamId = site?.teamId;

  const permissions = usePermissions({ teamId });

  return {
    ...permissions,
    teamId,
    isLoading: permissions.isLoading || site === undefined,
  };
}
