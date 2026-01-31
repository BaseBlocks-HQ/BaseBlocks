"use client";

import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { useQuery } from "convex/react";

interface UsePermissionsOptions {
  companyId?: Id<"companies">;
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
 * Hook to check user permissions for a company
 *
 * Usage:
 * ```tsx
 * const { canEdit, isAdmin, isLoading } = usePermissions({ companyId });
 *
 * if (isLoading) return <Spinner />;
 * if (!canEdit) return <ViewOnlyBanner />;
 * ```
 */
export function usePermissions({
  companyId,
}: UsePermissionsOptions): PermissionsResult {
  const myRole = useQuery(
    api.members.queries.getMyRole,
    companyId ? { companyId } : "skip",
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
 * Automatically fetches the company from the site
 */
export function useSitePermissions(siteId?: Id<"sites">): PermissionsResult & {
  companyId?: Id<"companies">;
} {
  const site = useQuery(api.sites.queries.get, siteId ? { siteId } : "skip");

  const companyId = site?.companyId;

  const permissions = usePermissions({ companyId });

  return {
    ...permissions,
    companyId,
    isLoading: permissions.isLoading || site === undefined,
  };
}
