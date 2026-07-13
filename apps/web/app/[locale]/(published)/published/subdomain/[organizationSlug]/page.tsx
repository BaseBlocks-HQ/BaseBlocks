import { buildPublicSiteFaviconMetadata } from "@/features/published-sites/favicon-metadata";
import { PublicSite } from "@/features/published-sites/public-site";
import { resolvePublishedPage } from "@/features/published-sites/read-model";
import type { Metadata } from "next";

type Props = { params: Promise<{ organizationSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { organizationSlug } = await params;
  return buildPublicSiteFaviconMetadata(
    await resolvePublishedPage(organizationSlug, undefined, []),
  );
}

export default async function PublishedSubdomainRoot({ params }: Props) {
  const { organizationSlug } = await params;
  const result = await resolvePublishedPage(organizationSlug, undefined, []);
  return (
    <PublicSite
      result={result}
      organizationSlug={organizationSlug}
      pagePath={[]}
    />
  );
}
