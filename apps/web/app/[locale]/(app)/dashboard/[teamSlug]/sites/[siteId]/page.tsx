import { SiteEditor } from "@/features/editor/editor";

type Props = {
  params: Promise<{ siteId: string; teamSlug: string }>;
};

export default async function TeamSiteEditorPage({ params }: Props) {
  const { siteId } = await params;
  return <SiteEditor siteId={siteId} />;
}
