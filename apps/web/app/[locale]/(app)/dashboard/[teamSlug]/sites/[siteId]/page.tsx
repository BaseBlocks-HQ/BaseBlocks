import { SiteEditor } from "@/features/editor/editor";
import { getToken } from "@/lib/auth/server";
import { getServerConvexClient } from "@/lib/convex/server";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";

type Props = {
  params: Promise<{ siteId: string; teamSlug: string }>;
};

export default async function TeamSiteEditorPage({ params }: Props) {
  const [{ siteId, teamSlug }, token] = await Promise.all([params, getToken()]);
  const availability = token
    ? await getServerConvexClient(token).query(
        api.aiCredits.getSiteAvailability,
        { siteId: siteId as Id<"sites"> },
      )
    : null;
  return (
    <SiteEditor
      aiAvailabilityReason={availability?.reason ?? "creditsRequired"}
      siteId={siteId}
      teamSlug={teamSlug}
    />
  );
}
