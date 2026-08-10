import { getToken } from "@/lib/auth/server";
import { getServerConvexClient } from "@/lib/convex/server";
import { deleteObject } from "@/lib/files/server";
import { detachDomain } from "@/lib/vercel/domains";
import { api, type Id } from "@baseblocks/backend";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function isAlreadyRemoved(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("404") || message.includes("not found");
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ organizationId: string }> },
) {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { organizationId } = await params;
    const convex = getServerConvexClient(token);
    const manifest = await convex.query(api.organizations.getDeletionManifest, {
      organizationId,
    });
    if (!manifest) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // External cleanup is deliberately idempotent. The transactional deletion
    // below only runs after every external resource has been removed.
    for (const connectionId of manifest.connectionIds) {
      await convex.action(api.integrations.disconnectImmediately, {
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
    // Bound each site's database cascade to its own Convex transaction. This
    // avoids one large organization-wide transaction while preserving tenant
    // authorization on every step.
    for (const siteId of manifest.siteIds) {
      await convex.mutation(api.organizations.deleteOwnedSite, {
        organizationId,
        siteId,
      });
    }

    const result = await convex.mutation(api.organizations.deleteOwned, {
      organizationId,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Organization deletion failed",
      },
      { status: 400 },
    );
  }
}
