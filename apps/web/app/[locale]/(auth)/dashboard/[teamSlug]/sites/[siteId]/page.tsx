import { getTeamDashboardPath } from "@/lib/routes/team-routes";
import { getWorkspaceBoundaryContext } from "@/lib/workspace/server";
import { SiteEditor } from "@/modules/editor/site-editor";
import { api } from "@baseblocks/backend";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ siteId: string; teamSlug: string }>;
};

export default async function TeamSiteEditorPage({ params }: Props) {
  const { siteId, teamSlug } = await params;
  const {
    client,
    state: { requestedWorkspace },
  } = await getWorkspaceBoundaryContext(teamSlug);

  if (!requestedWorkspace) {
    redirect("/dashboard");
  }

  const [site, pages] = await Promise.all([
    client.query(api.sites.queries.get, { siteId: siteId as never }),
    client.query(api.pages.queries.list, { siteId: siteId as never }),
  ]);

  if (!site || site.teamId !== requestedWorkspace._id) {
    redirect(getTeamDashboardPath(requestedWorkspace.slug));
  }

  return <SiteEditor siteId={siteId} initialSite={site} initialPages={pages} />;
}
