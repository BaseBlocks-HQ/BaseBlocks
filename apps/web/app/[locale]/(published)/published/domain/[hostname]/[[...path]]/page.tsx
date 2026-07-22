import { buildPublicSiteMetadata } from "@/features/published-sites/favicon-metadata";
import { PublicSite } from "@/features/published-sites/public-site";
import {
  resolveCustomDomain,
  resolvePublishedPage,
} from "@/features/published-sites/read-model";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { encodePath } from "@/lib/routing/hosts";
import { getPublishedOrigin } from "@/lib/seo/site-url";

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
  const canonicalPath = encodePath(result?.canonicalUrlInputs.pagePath ?? []);
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
  return (
    <PublicSite result={result} organizationSlug={mapping.organizationSlug} />
  );
}
