import { buildPublicSiteMetadata } from "@/features/published-sites/metadata";
import { PublicSite } from "@/features/published-sites/public-site";
import { PublicSiteSeo } from "@/features/published-sites/seo";
import { resolvePublishedPage } from "@/features/published-sites/read-model";
import type { Metadata } from "next";

type Props = { params: Promise<{ organizationSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { organizationSlug } = await params;
  return buildPublicSiteMetadata(
    await resolvePublishedPage(organizationSlug, undefined, []),
  );
}

export default async function PublishedSubdomainRoot({ params }: Props) {
  const { organizationSlug } = await params;
  const result = await resolvePublishedPage(organizationSlug, undefined, []);
  return (
    <>
      {result ? <PublicSiteSeo result={result} /> : null}
      <PublicSite
        result={result}
        organizationSlug={organizationSlug}
        pagePath={[]}
      />
    </>
  );
}
