import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { publicationActionForTarget } from "./releaseState";

const activePublicationStatuses = ["building", "clearing"] as const;

export async function findActivePublication(
  ctx: MutationCtx,
  siteId: Id<"sites">,
) {
  const releases = await Promise.all(
    activePublicationStatuses.map((status) =>
      ctx.db
        .query("siteReleases")
        .withIndex("by_site_publication_status", (q) =>
          q.eq("siteId", siteId).eq("publicationStatus", status),
        )
        .first(),
    ),
  );
  return releases.find((release) => release !== null) ?? null;
}

export async function promoteRelease(
  ctx: MutationCtx,
  site: Doc<"sites">,
  release: Doc<"siteReleases">,
  actorId: string,
) {
  const currentRelease = site.liveReleaseId
    ? await ctx.db.get(site.liveReleaseId)
    : null;
  const now = Date.now();
  await ctx.db.patch(site._id, {
    liveReleaseId: release._id,
    updatedAt: now,
  });
  await ctx.db.insert("publicationEvents", {
    siteId: site._id,
    action: publicationActionForTarget(currentRelease?.number, release.number),
    fromReleaseId: site.liveReleaseId,
    toReleaseId: release._id,
    actorId,
    createdAt: now,
  });
}
