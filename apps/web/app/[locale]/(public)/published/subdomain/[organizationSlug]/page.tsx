import { buildPublicSiteMetadata } from "@/modules/public-site/metadata";
import { PublicSiteRoot } from "@/modules/public-site/public-site-root";
import { PublicSiteSeo } from "@/modules/public-site/seo";
import type { Metadata } from "next";

type Props = { params: Promise<{ organizationSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { organizationSlug } = await params;
  return buildPublicSiteMetadata({ teamSlug: organizationSlug });
}

export default async function PublishedSubdomainRoot({ params }: Props) {
  const { organizationSlug } = await params;
  return (
    <>
      <PublicSiteSeo teamSlug={organizationSlug} />
      <PublicSiteRoot teamSlug={organizationSlug} />
    </>
  );
}
