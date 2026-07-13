import "server-only";

import { getServerConvexClient } from "@/lib/convex/server";
import { normalizeHostname } from "@/lib/routing/hosts";
import { api } from "@baseblocks/backend";
import { cache } from "react";

export type PublishedPageResult = NonNullable<
  Awaited<ReturnType<typeof resolvePublishedPage>>
>;

export const resolvePublishedPage = cache(
  async (
    organizationSlug: string,
    siteSlug: string | undefined,
    pagePath: string[],
  ) =>
    getServerConvexClient().query(api.published.resolve, {
      organizationSlug,
      siteSlug,
      pagePath,
    }),
);

export const resolveCustomDomain = cache((hostname: string) =>
  getServerConvexClient().query(api.siteDomains.resolve, {
    hostname: normalizeHostname(hostname),
  }),
);
