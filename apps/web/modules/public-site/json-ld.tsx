import {
  JsonLdScript,
  buildBreadcrumbJsonLd,
  buildWebSiteJsonLd,
} from "@/lib/json-ld";
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

/**
 * Server component that renders JSON-LD structured data for public site pages.
 * Include this in your page.tsx server components.
 */
export async function PublicSiteJsonLd({
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

  if (!site) return null;

  // No structured data for non-public sites — don't help search engines index unlisted content
  if (site.visibility && site.visibility !== "public") return null;

  const siteTitle = site.settings?.siteTitle?.trim() || site.name;
  const siteDescription = site.settings?.siteDescription?.trim() || undefined;
  const resolvedSiteSlug = siteSlug ?? site.slug;

  // WebSite schema — always present
  const webSiteJsonLd = buildWebSiteJsonLd({
    siteTitle,
    siteDescription,
    teamSlug,
    siteSlug: resolvedSiteSlug,
  });

  // BreadcrumbList schema — only when we have page path segments
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
      {breadcrumbJsonLd && (
        <JsonLdScript
          data={breadcrumbJsonLd as unknown as Record<string, unknown>}
        />
      )}
    </>
  );
}
