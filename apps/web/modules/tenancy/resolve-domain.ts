import "server-only";

import { getServerConvexClient } from "@/app/_convex/server";
import { normalizeHostname } from "@/modules/tenancy/host";
import { api } from "@baseblocks/backend";

export async function resolveCustomDomain(hostname: string) {
  return getServerConvexClient().query(api.siteDomains.resolve, {
    hostname: normalizeHostname(hostname),
  });
}
