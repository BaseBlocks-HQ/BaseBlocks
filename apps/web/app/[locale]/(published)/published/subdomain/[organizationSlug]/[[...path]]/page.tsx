import { buildPublicSiteFaviconMetadata } from "@/features/published-sites/favicon-metadata";
import { PublicSite } from "@/features/published-sites/public-site";
import { resolvePublishedPage } from "@/features/published-sites/read-model";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ organizationSlug: string; path?: string[] }>;
};

async function resolveRoute(params: Props["params"]) {
  const { organizationSlug, path = [] } = await params;
  const [siteSlug, ...pagePath] = path;
  return {
    organizationSlug,
    pagePath,
    siteSlug,
    result: await resolvePublishedPage(organizationSlug, siteSlug, pagePath),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { result } = await resolveRoute(params);
  return buildPublicSiteFaviconMetadata(result);
}

export default async function PublishedSubdomainPage({ params }: Props) {
  const { organizationSlug, pagePath, result, siteSlug } =
    await resolveRoute(params);
  return (
    <PublicSite
      result={result}
      organizationSlug={organizationSlug}
      siteSlug={siteSlug}
      pagePath={pagePath}
    />
  );
}
