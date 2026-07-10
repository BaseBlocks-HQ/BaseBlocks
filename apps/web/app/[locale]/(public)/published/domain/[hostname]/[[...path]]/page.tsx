import { buildPublicSiteMetadata } from "@/modules/public-site/metadata";
import { PublicSite } from "@/modules/public-site/public-site";
import { PublicSiteSeo } from "@/modules/public-site/seo";
import { resolveCustomDomain } from "@/modules/tenancy/resolve-domain";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ hostname: string; path?: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { hostname, path = [] } = await params;
  const mapping = await resolveCustomDomain(hostname);
  if (!mapping) return {};
  return buildPublicSiteMetadata({
    teamSlug: mapping.organizationSlug,
    siteSlug: mapping.siteSlug,
    pagePath: path,
    customDomain: mapping.hostname,
  });
}

export default async function PublishedDomainPage({ params }: Props) {
  const { hostname, path = [] } = await params;
  const mapping = await resolveCustomDomain(hostname);
  if (!mapping) notFound();
  return (
    <>
      <PublicSiteSeo
        teamSlug={mapping.organizationSlug}
        siteSlug={mapping.siteSlug}
        pagePath={path}
        customDomain={mapping.hostname}
      />
      <PublicSite teamSlug={mapping.organizationSlug} path={[mapping.siteSlug, ...path]} />
    </>
  );
}
