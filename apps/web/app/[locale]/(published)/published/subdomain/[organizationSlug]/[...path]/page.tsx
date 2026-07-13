import { buildPublicSiteFaviconMetadata } from "@/features/published-sites/favicon-metadata";
import { PublicSite } from "@/features/published-sites/public-site";
import { resolvePublishedPage } from "@/features/published-sites/read-model";
import type { Metadata } from "next";

type Props = { params: Promise<{ organizationSlug: string; path: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { organizationSlug, path } = await params;
  return buildPublicSiteFaviconMetadata(
    await resolvePublishedPage(organizationSlug, path[0], path.slice(1)),
  );
}

export default async function PublishedSubdomainPage({ params }: Props) {
  const { organizationSlug, path } = await params;
  const result = await resolvePublishedPage(
    organizationSlug,
    path[0],
    path.slice(1),
  );
  return (
    <PublicSite
      result={result}
      organizationSlug={organizationSlug}
      siteSlug={path[0]}
      pagePath={path.slice(1)}
    />
  );
}
