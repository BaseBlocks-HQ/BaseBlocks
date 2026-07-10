import { buildPublicSiteMetadata } from "@/modules/public-site/metadata";
import { PublicSite } from "@/modules/public-site/public-site";
import { PublicSiteSeo } from "@/modules/public-site/seo";
import type { Metadata } from "next";

type Props = { params: Promise<{ organizationSlug: string; path: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { organizationSlug, path } = await params;
  return buildPublicSiteMetadata({
    teamSlug: organizationSlug,
    siteSlug: path[0],
    pagePath: path.slice(1),
  });
}

export default async function PublishedSubdomainPage({ params }: Props) {
  const { organizationSlug, path } = await params;
  return (
    <>
      <PublicSiteSeo teamSlug={organizationSlug} siteSlug={path[0]} pagePath={path.slice(1)} />
      <PublicSite teamSlug={organizationSlug} path={path} />
    </>
  );
}
