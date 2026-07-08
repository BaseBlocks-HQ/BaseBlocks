import { buildPublicSiteMetadata } from "@/lib/metadata";
import { PublicSite } from "@/modules/public-site/public-site";
import { PublicSiteSeo } from "@/modules/public-site/seo";
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
      <PublicSiteSeo
        teamSlug={subdomain}
        siteSlug={siteSlug}
        pagePath={pagePath}
      />
      <PublicSite teamSlug={subdomain} path={path} />
    </>
  );
}
