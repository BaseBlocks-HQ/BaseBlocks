import {
  JsonLdScript,
  buildBreadcrumbJsonLd,
  buildWebSiteJsonLd,
} from "@/modules/public-site/json-ld";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { ConvexHttpClient } from "convex/browser";

const EMPTY_PATH: string[] = [];

interface SiteDoc {
  _id: Id<"sites">;
  name: string;
  slug: string;
  visibility?: string;
  settings?: {
    siteTitle?: string;
    siteDescription?: string;
  };
}

interface SiteWithDefaultPage {
  site: SiteDoc;
}

function getConvexClient(): ConvexHttpClient | null {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return null;
  return new ConvexHttpClient(convexUrl);
}

export async function PublicSiteSeo({
  teamSlug,
  siteSlug,
  pagePath = EMPTY_PATH,
}: {
  teamSlug: string;
  siteSlug?: string;
  pagePath?: string[];
}) {
  const client = getConvexClient();
  if (!client) return null;

  let site: SiteDoc | null = null;

  try {
    if (siteSlug) {
      site = (await client.query(api.sites.queries.getBySlug, {
        teamSlug,
        siteSlug,
      })) as SiteDoc | null;
    } else {
      const data = (await client.query(api.sites.queries.getWithDefaultPage, {
        teamSlug,
      })) as SiteWithDefaultPage | null;
      site = data?.site ?? null;
    }
  } catch {
    return null;
  }

  if (!site || (site.visibility && site.visibility !== "public")) return null;

  const siteTitle = site.settings?.siteTitle?.trim() || site.name;
  const siteDescription = site.settings?.siteDescription?.trim() || undefined;
  const resolvedSiteSlug = siteSlug ?? site.slug;
  const webSiteJsonLd = buildWebSiteJsonLd({
    siteTitle,
    siteDescription,
    teamSlug,
    siteSlug: resolvedSiteSlug,
  });
  const breadcrumbJsonLd =
    pagePath.length > 0
      ? buildBreadcrumbJsonLd({
          teamSlug,
          siteSlug: resolvedSiteSlug,
          siteTitle,
          crumbs: pagePath.map((slug, i) => ({
            title: slug
              .replace(/-/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase()),
            slug: pagePath.slice(0, i + 1).join("/"),
          })),
        })
      : null;

  return (
    <>
      <JsonLdScript
        data={webSiteJsonLd as unknown as Record<string, unknown>}
      />
      {breadcrumbJsonLd ? (
        <JsonLdScript
          data={breadcrumbJsonLd as unknown as Record<string, unknown>}
        />
      ) : null}
    </>
  );
}
