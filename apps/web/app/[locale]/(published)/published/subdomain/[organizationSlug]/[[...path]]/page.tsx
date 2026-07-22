import { buildPublicSiteMetadata } from "@/features/published-sites/favicon-metadata";
import { PublicSite } from "@/features/published-sites/public-site";
import { resolvePublishedPage } from "@/features/published-sites/read-model";
import { getSiteUrl } from "@/features/published-sites/urls";
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
  const canonicalUrl = result
    ? getSiteUrl(
        result.canonicalUrlInputs.organizationSlug,
        result.canonicalUrlInputs.siteSlug,
        result.canonicalUrlInputs.pagePath,
      )
    : null;
  return buildPublicSiteMetadata(result, canonicalUrl);
}

export default async function PublishedSubdomainPage({ params }: Props) {
  const { organizationSlug, result } = await resolveRoute(params);
  return <PublicSite result={result} organizationSlug={organizationSlug} />;
}
