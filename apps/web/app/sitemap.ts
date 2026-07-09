import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { ConvexHttpClient } from "convex/browser";
import type { MetadataRoute } from "next";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "baseblocks.dev";

function getConvexClient(): ConvexHttpClient | null {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return null;
  return new ConvexHttpClient(convexUrl);
}

interface PublishedSite {
  teamSlug: string;
  siteSlug: string;
  updatedAt: number;
}

interface DeployedPage {
  path: string;
  updatedAt: number;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const client = getConvexClient();
  if (!client) return [];

  const entries: MetadataRoute.Sitemap = [];

  // Add the main landing page
  entries.push({
    url: `https://${ROOT_DOMAIN}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1.0,
  });

  try {
    const publishedSites = (await client.query(
      api.sites.listPublishedSlugs,
      {},
    )) as PublishedSite[];

    for (const site of publishedSites) {
      const siteUrl = `https://${site.teamSlug}.${ROOT_DOMAIN}/${site.siteSlug}`;

      // Add site root
      entries.push({
        url: siteUrl,
        lastModified: new Date(site.updatedAt),
        changeFrequency: "weekly",
        priority: 0.8,
      });

      // Fetch deployed pages for this site
      try {
        // We need the site ID — use getBySlug to resolve it
        const siteDoc = (await client.query(api.sites.getBySlug, {
          teamSlug: site.teamSlug,
          siteSlug: site.siteSlug,
        })) as { _id: Id<"sites"> } | null;

        if (siteDoc) {
          const pages = (await client.query(
            api.pages.listDeployedPaths,
            { siteId: siteDoc._id },
          )) as DeployedPage[];

          for (const page of pages) {
            entries.push({
              url: `https://${site.teamSlug}.${ROOT_DOMAIN}/${site.siteSlug}/${page.path}`,
              lastModified: new Date(page.updatedAt),
              changeFrequency: "weekly",
              priority: 0.6,
            });
          }
        }
      } catch {
        // Skip pages for this site if query fails
      }
    }
  } catch {
    // Return at least the landing page if Convex is unreachable
  }

  return entries;
}
