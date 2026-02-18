import { SubdomainRootPageClient } from "@/components/public/subdomain-root-page-client";
import { buildPublicSiteMetadata } from "@/lib/public-site-metadata";
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
