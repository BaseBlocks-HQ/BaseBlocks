import { buildPublicSiteMetadata } from "@/features/published-sites/metadata";
import { PublicSite } from "@/features/published-sites/public-site";
import { PublicSiteSeo } from "@/features/published-sites/seo";
import { resolveCustomDomain } from "@/features/published-sites-resolver";
import { resolvePublishedPage } from "@/features/published-sites/read-model";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

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
  return buildPublicSiteMetadata(result, mapping.hostname);
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
    <>
      {result ? (
        <PublicSiteSeo result={result} customDomain={mapping.hostname} />
      ) : null}
      <PublicSite
        teamSlug={mapping.organizationSlug}
        path={[mapping.siteSlug, ...path]}
      />
    </>
  );
}
