import { PublicSitePageClient } from "@/components/public/public-site-page-client";
import { buildPublicSiteMetadata } from "@/lib/public-site-metadata";
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

export default function PublicSitePage({ params }: Props) {
  return <PublicSitePageClient params={params} />;
}
