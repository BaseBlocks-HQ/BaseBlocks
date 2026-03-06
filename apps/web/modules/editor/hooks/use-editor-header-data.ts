"use client";

import { getSiteUrl } from "@/lib/url";
import type {
  AccessCodeData,
  DeploymentData,
  SharingSettings,
} from "@/modules/shared/types";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

interface UseEditorHeaderDataParams {
  siteId: Id<"sites">;
  teamSlug: string;
  siteSlug: string;
  historyOpen: boolean;
}

export function useEditorHeaderData({
  siteId,
  teamSlug,
  siteSlug,
  historyOpen,
}: UseEditorHeaderDataParams) {
  const deployMut = useMutation(api.deployments.mutations.deploy);
  const rollbackMut = useMutation(api.deployments.mutations.rollback);

  const sharingSettings = useQuery(api.sharing.queries.getSettings, { siteId });
  const rawAccessCode = useQuery(api.sharing.queries.getAccessCode, { siteId });
  const rawDeployments = useQuery(
    api.deployments.queries.list,
    historyOpen ? { siteId, limit: 50 } : "skip",
  );

  const settings: SharingSettings | undefined = sharingSettings
    ? {
        visibility: sharingSettings.visibility,
        accessCodeRotationHours: sharingSettings.accessCodeRotationHours,
        accessCodeSessionDays: sharingSettings.accessCodeSessionDays,
      }
    : undefined;

  const accessCode: AccessCodeData | null | undefined =
    rawAccessCode === undefined
      ? undefined
      : rawAccessCode
        ? {
            code: rawAccessCode.code,
            expiresAt: rawAccessCode.expiresAt,
            isExpired: rawAccessCode.isExpired,
          }
        : null;

  const deployments: DeploymentData[] | undefined = rawDeployments?.map(
    (deployment) => ({
      id: deployment._id as string,
      version: deployment.version,
      status: deployment.status,
      notes: deployment.notes,
      deployedAt: deployment.deployedAt,
      summary: deployment.summary,
    }),
  );

  return {
    siteUrl: getSiteUrl(teamSlug, siteSlug),
    settings,
    accessCode,
    deployments,
    deploySite: async (notes?: string) => {
      try {
        await deployMut({ siteId, notes });
        toast.success("Changes deployed successfully");
      } catch (_error) {
        toast.error("Failed to deploy changes");
      }
    },
    rollbackDeployment: async (targetDeploymentId: string) => {
      await rollbackMut({
        siteId,
        targetDeploymentId: targetDeploymentId as Id<"deployments">,
      });
    },
  };
}
