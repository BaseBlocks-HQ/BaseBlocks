import { buildPublicSiteMetadata } from "@/lib/metadata";
import { PublicSiteJsonLd } from "@/modules/marketing/public-site/json-ld";
import { SubdomainRootPageClient } from "@/modules/marketing/public-site/subdomain-root-page-client";
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
      <PublicSiteJsonLd teamSlug={subdomain} />
      <SubdomainRootPageClient subdomain={subdomain} />
    </>
  );
}
