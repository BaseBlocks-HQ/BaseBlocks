import "server-only";

import { getServerConvexClient } from "@/lib/convex/server";
import { normalizeHostname } from "@/lib/routing/hosts";
import { api } from "@baseblocks/backend";

export async function resolveCustomDomain(hostname: string) {
  return getServerConvexClient().query(api.siteDomains.resolve, {
    hostname: normalizeHostname(hostname),
  });
}
