import { buildPublicSiteMetadata } from "@/features/published-sites/favicon-metadata";
import { PublicSite } from "@/features/published-sites/public-site";
import {
  isAccessiblePublishedPage,
  resolveCustomDomain,
  resolvePublishedPage,
} from "@/features/published-sites/read-model";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { encodePath } from "@/lib/routing/hosts";
import { getPublishedOrigin } from "@/lib/seo/site-url";
import { getSiteUrl } from "@/features/published-sites/urls";

type Props = { params: Promise<{ hostname: string; path?: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hostname, path = [] } = await params;
  const mapping = await resolveCustomDomain(hostname);
  if (!mapping) return {};
  const result = await resolvePublishedPage(
    mapping.organizationSlug,
    mapping.siteSlug,
    path,
  );
  const canonicalPath = encodePath(
    isAccessiblePublishedPage(result)
      ? result.canonicalUrlInputs.pagePath
      : path,
  );
  const canonicalUrl = `${getPublishedOrigin(hostname)}${canonicalPath ? `/${canonicalPath}` : "/"}`;
  return buildPublicSiteMetadata(result, canonicalUrl);
}

export default async function PublishedDomainPage({ params }: Props) {
  const { hostname, path = [] } = await params;
  const mapping = await resolveCustomDomain(hostname);
  if (!mapping) notFound();
  const result = await resolvePublishedPage(
    mapping.organizationSlug,
    mapping.siteSlug,
    path,
  );
  const privateAccessUrl = getSiteUrl(
    mapping.organizationSlug,
    mapping.siteSlug,
    path,
  );
  return (
    <PublicSite
      result={result}
      organizationSlug={mapping.organizationSlug}
      privateAccessUrl={privateAccessUrl}
    />
  );
}
