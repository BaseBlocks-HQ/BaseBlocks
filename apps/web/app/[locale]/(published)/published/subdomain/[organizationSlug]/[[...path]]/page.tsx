import { buildPublicSiteMetadata } from "@/features/published-sites/favicon-metadata";
import { PublicSite } from "@/features/published-sites/public-site";
import {
  isAccessiblePublishedPageMetadata,
  resolvePublishedPage,
  resolvePublishedPageMetadata,
} from "@/features/published-sites/read-model";
import { getSiteUrl } from "@/features/published-sites/urls";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ organizationSlug: string; path?: string[] }>;
};

async function resolveRoute(params: Props["params"]) {
  const { organizationSlug, path = [] } = await params;
  const [siteSlug, ...pagePath] = path;
  const pagePathKey = pagePath.join("/");
  return {
    organizationSlug,
    pagePath,
    siteSlug,
    result: siteSlug
      ? await resolvePublishedPage(organizationSlug, siteSlug, pagePathKey)
      : null,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { organizationSlug, path = [] } = await params;
  const [siteSlug, ...pagePath] = path;
  const result = siteSlug
    ? await resolvePublishedPageMetadata(
        organizationSlug,
        siteSlug,
        pagePath.join("/"),
      )
    : null;
  const canonicalUrl = isAccessiblePublishedPageMetadata(result)
    ? getSiteUrl(
        result.organization.slug,
        result.site.slug,
        result.canonicalPath,
      )
    : null;
  return buildPublicSiteMetadata(result, canonicalUrl);
}

export default async function PublishedSubdomainPage({ params }: Props) {
  const { organizationSlug, result } = await resolveRoute(params);
  return (
    <PublicSite
      result={result}
      organizationSlug={organizationSlug}
      privateAccessUrl={null}
    />
  );
}
