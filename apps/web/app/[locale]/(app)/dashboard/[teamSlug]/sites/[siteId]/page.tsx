import { SiteEditor } from "@/features/editor/editor";
import { editorAi } from "@/flags";

type Props = {
  params: Promise<{ siteId: string; teamSlug: string }>;
};

export default async function TeamSiteEditorPage({ params }: Props) {
  const [{ siteId }, editorAiEnabled] = await Promise.all([params, editorAi()]);
  return <SiteEditor editorAiEnabled={editorAiEnabled} siteId={siteId} />;
}
