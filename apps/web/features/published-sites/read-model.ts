import "server-only";

import { getToken } from "@/lib/auth/server";
import { getServerConvexClient } from "@/lib/convex/server";
import { normalizeHostname } from "@/lib/routing/hosts";
import { api, type Id } from "@baseblocks/backend";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import {
  resolveSeoAuditCustomDomain,
  resolveSeoAuditPage,
  resolveSeoAuditPageMetadata,
  resolveSeoAuditSitemap,
} from "./seo-audit-fixtures";

async function queryPublishedSite(
  organizationSlug: string,
  siteSlug: string,
  token?: string | null,
) {
  return getServerConvexClient(token).query(api.published.resolveSite, {
    organizationSlug,
    siteSlug,
  });
}

const queryPublicPublishedSite = unstable_cache(
  (organizationSlug: string, siteSlug: string) =>
    queryPublishedSite(organizationSlug, siteSlug),
  ["published-site-resolution-v1"],
  { revalidate: 30 },
);

async function queryReleasePage(
  releaseId: Id<"siteReleases">,
  path: string,
  token?: string | null,
) {
  return getServerConvexClient(token).query(api.published.getPage, {
    releaseId,
    path,
  });
}

async function queryReleasePageMetadata(
  releaseId: Id<"siteReleases">,
  path: string,
  token?: string | null,
) {
  return getServerConvexClient(token).query(api.published.getPageMetadata, {
    releaseId,
    path,
  });
}

async function queryReleaseNavigation(
  releaseId: Id<"siteReleases">,
  token?: string | null,
) {
  return getServerConvexClient(token).query(api.published.getNavigation, {
    releaseId,
  });
}

async function queryReleaseLibraries(
  releaseId: Id<"siteReleases">,
  libraryIds: Id<"documentLibraries">[],
  token?: string | null,
) {
  return getServerConvexClient(token).query(api.published.getLibraries, {
    releaseId,
    libraryIds,
  });
}

const queryPublicReleasePage = unstable_cache(
  (releaseId: Id<"siteReleases">, path: string) =>
    queryReleasePage(releaseId, path),
  // The response contains the parsed document shape. Bump this key whenever
  // that shape changes so a rollback cannot keep an incompatible document.
  ["published-release-page-v4"],
);

const queryPublicReleasePageMetadata = unstable_cache(
  (releaseId: Id<"siteReleases">, path: string) =>
    queryReleasePageMetadata(releaseId, path),
  ["published-release-page-metadata-v1"],
);

const queryPublicReleaseNavigation = unstable_cache(
  (releaseId: Id<"siteReleases">) => queryReleaseNavigation(releaseId),
  ["published-release-navigation-v2"],
);

const queryPublicReleaseLibraries = unstable_cache(
  (releaseId: Id<"siteReleases">, libraryIdsKey: string) =>
    queryReleaseLibraries(
      releaseId,
      JSON.parse(libraryIdsKey) as Id<"documentLibraries">[],
    ),
  ["published-release-libraries-v2"],
);

const queryCustomDomain = unstable_cache(
  (hostname: string) =>
    getServerConvexClient().query(api.siteDomains.resolve, { hostname }),
  ["published-custom-domain"],
  { revalidate: 300 },
);

const queryPublishedSitemap = unstable_cache(
  (organizationSlug: string, siteSlug?: string) =>
    getServerConvexClient().query(api.published.sitemap, {
      organizationSlug,
      siteSlug,
    }),
  ["published-sitemap"],
  { revalidate: 300 },
);

type PublishedSiteResolution = NonNullable<
  Awaited<ReturnType<typeof queryPublishedSite>>
>;
type AccessiblePublishedSite = Extract<
  PublishedSiteResolution,
  { access: { status: "accessible" } }
>;
type PublishedReleasePage = NonNullable<
  Awaited<ReturnType<typeof queryReleasePage>>
>;
type PublishedReleasePageMetadata = NonNullable<
  Awaited<ReturnType<typeof queryReleasePageMetadata>>
>;
type PublishedNavigation = NonNullable<
  Awaited<ReturnType<typeof queryReleaseNavigation>>
>;
type PublishedLibraries = NonNullable<
  Awaited<ReturnType<typeof queryReleaseLibraries>>
>;

export type PublishedPageResult = AccessiblePublishedSite &
  Omit<PublishedReleasePage, "canonicalPath" | "libraryIds"> & {
    libraries: PublishedLibraries;
    navigation: PublishedNavigation;
    canonicalUrlInputs: {
      organizationSlug: string;
      siteSlug: string;
      pagePath: string[];
    };
  };

export type PublishedPageResolution =
  | PublishedPageResult
  | {
      access: {
        status: "authentication-required" | "forbidden";
        visibility: "private";
      };
    }
  | { access: { status: "missing"; visibility: "private" | "public" } };

export type PublishedPageMetadataResult = AccessiblePublishedSite &
  PublishedReleasePageMetadata;

export type PublishedPageMetadataResolution =
  | PublishedPageMetadataResult
  | Exclude<PublishedPageResolution, PublishedPageResult>;

function isAccessiblePublishedSite(
  result: Awaited<ReturnType<typeof queryPublishedSite>>,
): result is AccessiblePublishedSite {
  return result?.access.status === "accessible" && "releaseId" in result;
}

export function isAccessiblePublishedPage(
  result: PublishedPageResolution | null,
): result is PublishedPageResult {
  return result?.access.status === "accessible";
}

export function isAccessiblePublishedPageMetadata(
  result: PublishedPageMetadataResolution | null,
): result is PublishedPageMetadataResult {
  return result?.access.status === "accessible";
}

async function resolvePublishedPageMetadataUncached(
  organizationSlug: string,
  siteSlug: string,
  path: string,
): Promise<PublishedPageMetadataResolution | null> {
  const fixture = resolveSeoAuditPageMetadata(
    organizationSlug,
    siteSlug,
    path ? path.split("/") : [],
  );
  if (fixture !== undefined) {
    return fixture as PublishedPageMetadataResolution | null;
  }

  let token: string | null | undefined;
  let siteResolution = await queryPublicPublishedSite(
    organizationSlug,
    siteSlug,
  );
  if (siteResolution?.access.status === "authentication-required") {
    token = await getToken();
    if (!token) return siteResolution as PublishedPageMetadataResolution;
    siteResolution = await queryPublishedSite(
      organizationSlug,
      siteSlug,
      token,
    );
  }
  if (!isAccessiblePublishedSite(siteResolution)) {
    return siteResolution as PublishedPageMetadataResolution | null;
  }

  const metadata =
    siteResolution.access.visibility === "public"
      ? await queryPublicReleasePageMetadata(siteResolution.releaseId, path)
      : await queryReleasePageMetadata(siteResolution.releaseId, path, token);
  if (!metadata) {
    return {
      access: {
        status: "missing",
        visibility: siteResolution.access.visibility,
      },
    };
  }
  return { ...siteResolution, ...metadata };
}

export const resolvePublishedPageMetadata = cache(
  resolvePublishedPageMetadataUncached,
);

async function resolvePublishedPageUncached(
  organizationSlug: string,
  siteSlug: string,
  path: string,
): Promise<PublishedPageResolution | null> {
  const fixture = resolveSeoAuditPage(
    organizationSlug,
    siteSlug,
    path ? path.split("/") : [],
  );
  if (fixture !== undefined) {
    return fixture as PublishedPageResolution | null;
  }

  let token: string | null | undefined;
  let siteResolution = await queryPublicPublishedSite(
    organizationSlug,
    siteSlug,
  );
  if (siteResolution?.access.status === "authentication-required") {
    token = await getToken();
    if (!token) return siteResolution as PublishedPageResolution;
    siteResolution = await queryPublishedSite(
      organizationSlug,
      siteSlug,
      token,
    );
  }
  if (!isAccessiblePublishedSite(siteResolution)) {
    return siteResolution as PublishedPageResolution | null;
  }

  const isPublic = siteResolution.access.visibility === "public";
  const [page, navigation] = isPublic
    ? await Promise.all([
        queryPublicReleasePage(siteResolution.releaseId, path),
        queryPublicReleaseNavigation(siteResolution.releaseId),
      ])
    : await Promise.all([
        queryReleasePage(siteResolution.releaseId, path, token),
        queryReleaseNavigation(siteResolution.releaseId, token),
      ]);
  if (!page || !navigation) {
    return {
      access: {
        status: "missing",
        visibility: siteResolution.access.visibility,
      },
    };
  }

  const libraries = page.libraryIds.length
    ? isPublic
      ? await queryPublicReleaseLibraries(
          siteResolution.releaseId,
          JSON.stringify(page.libraryIds),
        )
      : await queryReleaseLibraries(
          siteResolution.releaseId,
          page.libraryIds,
          token,
        )
    : [];
  if (!libraries) {
    return {
      access: {
        status: "missing",
        visibility: siteResolution.access.visibility,
      },
    };
  }

  return {
    ...siteResolution,
    page: page.page,
    content: page.content,
    imageIds: page.imageIds ?? [],
    libraries,
    navigation,
    canonicalUrlInputs: {
      organizationSlug: siteResolution.organization.slug,
      siteSlug: siteResolution.site.slug,
      pagePath: page.canonicalPath,
    },
    updatedAt: page.updatedAt,
  };
}

/** Request-local route composition keyed exclusively by primitive values. */
export const resolvePublishedPage = cache(resolvePublishedPageUncached);

export const resolveCustomDomain = cache((hostname: string) => {
  const normalizedHostname = normalizeHostname(hostname);
  const fixture = resolveSeoAuditCustomDomain(normalizedHostname);
  if (fixture) return Promise.resolve(fixture);
  return queryCustomDomain(normalizedHostname);
});

export const resolvePublishedSitemap = cache(
  (organizationSlug: string, siteSlug?: string) => {
    const fixture = resolveSeoAuditSitemap(organizationSlug, siteSlug);
    if (fixture) return Promise.resolve(fixture);
    return queryPublishedSitemap(organizationSlug, siteSlug) as Promise<
      Array<{
        siteSlug: string;
        updatedAt: number;
        pages: Array<{ path: string[]; updatedAt: number }>;
      }>
    >;
  },
);
