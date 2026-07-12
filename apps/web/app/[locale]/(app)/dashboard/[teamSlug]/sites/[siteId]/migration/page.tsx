import { SiteEditorV2 } from "@/features/editor-v2/site-editor-v2";
import "@openeditor/ui/styles.css";

type Props = {
  params: Promise<{ siteId: string; teamSlug: string }>;
};

export default async function SiteMigrationPage({ params }: Props) {
  const { siteId, teamSlug } = await params;
  return <SiteEditorV2 migrationTools siteId={siteId} teamSlug={teamSlug} />;
}
