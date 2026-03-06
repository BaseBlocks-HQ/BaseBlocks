import { buildPublicSiteMetadata } from "@/lib/metadata";
import { PublicSiteJsonLd } from "@/modules/public-site/json-ld";
import { PublicSitePageClient } from "@/modules/public-site/public-site-page-client";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ subdomain: string; path: string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subdomain, path } = await params;
  const siteSlug = path[0];
  const pagePath = path.length > 1 ? path.slice(1) : [];

  return buildPublicSiteMetadata({
    teamSlug: subdomain,
    siteSlug,
    pagePath,
  });
}

export default async function PublicSitePage({ params }: Props) {
  const { subdomain, path } = await params;
  const siteSlug = path[0];
  const pagePath = path.length > 1 ? path.slice(1) : [];

  return (
    <>
      <PublicSiteJsonLd
        teamSlug={subdomain}
        siteSlug={siteSlug}
        pagePath={pagePath}
      />
      <PublicSitePageClient subdomain={subdomain} path={path} />
    </>
  );
}
