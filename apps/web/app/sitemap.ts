import { getServerConvexClient } from "@/lib/convex/server";
import { getCanonicalUrl } from "@/features/published-sites/urls";
import { api } from "@baseblocks/backend";
import type { MetadataRoute } from "next";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "baseblocks.dev";

// Published content is deployment data and must never be captured at build time.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const published = await getServerConvexClient().query(
    api.published.sitemap,
    {},
  );
  const entries: MetadataRoute.Sitemap = [
    {
      url: `https://${ROOT_DOMAIN}`,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
  for (const entry of published) {
    entries.push({
      url: getCanonicalUrl(entry),
      lastModified: new Date(entry.updatedAt),
      changeFrequency: "weekly",
      priority: entry.pagePath.length === 0 ? 0.8 : 0.6,
    });
  }
  return entries;
}
