import "server-only";

import { deleteObject } from "@/lib/files/server";
import { detachDomain } from "@/lib/vercel/domains";
import { api, type Id } from "@baseblocks/backend";
import type { ConvexHttpClient } from "convex/browser";

export type WorkspaceDeletionMode = "workspace" | "account";

function isAlreadyRemoved(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("404") || message.includes("not found");
}

export async function deleteWorkspace(
  convex: ConvexHttpClient,
  input: { organizationId: string; mode: WorkspaceDeletionMode },
) {
  const manifest = await convex.query(api.organizations.getDeletionManifest, {
    organizationId: input.organizationId,
    mode: input.mode,
  });
  if (!manifest) throw new Error("Workspace not found");

  await convex.action(api.billing.terminateWorkspaceBilling, {
    organizationId: input.organizationId,
  });

  for (const connectionId of manifest.connectionIds) {
    await convex.action(api.integrations.disconnect, {
      connectionId: connectionId as Id<"integrationConnections">,
    });
  }
  for (const hostname of manifest.hostnames) {
    try {
      await detachDomain(hostname);
    } catch (error) {
      if (!isAlreadyRemoved(error)) throw error;
    }
  }
  for (const objectKey of manifest.objectKeys) {
    try {
      await deleteObject(objectKey);
    } catch (error) {
      if (!isAlreadyRemoved(error)) throw error;
    }
  }
  for (const siteId of manifest.siteIds) {
    await convex.mutation(api.organizations.deleteOwnedSite, {
      organizationId: input.organizationId,
      siteId,
    });
  }

  return await convex.mutation(api.organizations.deleteOwned, {
    organizationId: input.organizationId,
    mode: input.mode,
  });
}
