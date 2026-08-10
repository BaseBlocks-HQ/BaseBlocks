import { SiteEditor } from "@/features/editor/editor";
import { editorAi } from "@/flags";
import { getEditorAiReadiness } from "@/features/openeditor-ai/server/readiness";
import { getToken } from "@/lib/auth/server";
import { getServerConvexClient } from "@/lib/convex/server";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { headers } from "next/headers";

type Props = {
  params: Promise<{ siteId: string; teamSlug: string }>;
};

export default async function TeamSiteEditorPage({ params }: Props) {
  const [{ siteId, teamSlug }, editorAiEnabled, token] = await Promise.all([
    params,
    editorAi(),
    getToken(),
  ]);
  const requestHeaders = await headers();
  const readiness = getEditorAiReadiness(
    process.env,
    requestHeaders.get("x-vercel-oidc-token"),
  );
  const editorAiReady = Boolean(
    editorAiEnabled && readiness.ready && token && process.env.EDITOR_AI_MODEL,
  );
  const availability =
    editorAiReady && token && process.env.EDITOR_AI_MODEL
      ? await getServerConvexClient(token).query(
          api.aiCredits.getSiteAvailability,
          {
            siteId: siteId as Id<"sites">,
            modelId: process.env.EDITOR_AI_MODEL,
          },
        )
      : null;
  return (
    <SiteEditor
      aiAvailabilityReason={availability?.reason ?? "policyUnavailable"}
      editorAiEnabled={editorAiEnabled}
      siteId={siteId}
      teamSlug={teamSlug}
    />
  );
}
