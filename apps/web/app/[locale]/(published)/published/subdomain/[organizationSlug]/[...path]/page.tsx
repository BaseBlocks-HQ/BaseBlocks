import { buildPublicSiteMetadata } from "@/features/published-sites/metadata";
import { PublicSite } from "@/features/published-sites/public-site";
import { PublicSiteSeo } from "@/features/published-sites/seo";
import { resolvePublishedPage } from "@/features/published-sites/read-model";
import type { Metadata } from "next";

type Props = { params: Promise<{ organizationSlug: string; path: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { organizationSlug, path } = await params;
  return buildPublicSiteMetadata(
    await resolvePublishedPage(organizationSlug, path[0], path.slice(1)),
  );
}

export default async function PublishedSubdomainPage({ params }: Props) {
  const { organizationSlug, path } = await params;
  const result = await resolvePublishedPage(
    organizationSlug,
    path[0],
    path.slice(1),
  );
  return (
    <>
      {result ? <PublicSiteSeo result={result} /> : null}
      <PublicSite teamSlug={organizationSlug} path={path} />
    </>
  );
}
