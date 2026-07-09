import { buildPublicSiteMetadata } from "@/modules/public-site/metadata";
import { PublicSiteRoot } from "@/modules/public-site/public-site-root";
import { PublicSiteSeo } from "@/modules/public-site/seo";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ subdomain: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subdomain } = await params;
  return buildPublicSiteMetadata({ teamSlug: subdomain });
}

export default async function SubdomainRootPage({ params }: Props) {
  const { subdomain } = await params;
  return (
    <>
      <PublicSiteSeo teamSlug={subdomain} />
      <PublicSiteRoot teamSlug={subdomain} />
    </>
  );
}
