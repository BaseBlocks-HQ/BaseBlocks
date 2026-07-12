import { SiteEditor } from "@/features/editor/editor";

type Props = {
  params: Promise<{ siteId: string }>;
};

export default async function LegacySiteEditorPage({ params }: Props) {
  const { siteId } = await params;
  return <SiteEditor engine="legacy" siteId={siteId} />;
}
