import { buildPublicSiteMetadata } from "@/lib/metadata";
import { SubdomainRootPageClient } from "@/modules/public-site/subdomain-root-page-client";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ subdomain: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subdomain } = await params;
  return buildPublicSiteMetadata({ teamSlug: subdomain });
}

export default function SubdomainRootPage({ params }: Props) {
  return <SubdomainRootPageClient params={params} />;
}
