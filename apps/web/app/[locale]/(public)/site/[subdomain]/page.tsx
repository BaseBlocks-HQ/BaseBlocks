import { buildPublicSiteMetadata } from "@/lib/metadata";
import { PublicSiteSeo } from "@/modules/public-site/seo";
import { SubdomainRootPageClient } from "@/modules/public-site/subdomain-root-page-client";
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
      <SubdomainRootPageClient subdomain={subdomain} />
    </>
  );
}
