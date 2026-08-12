import type { Id, TableNames } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { assertDraftWritable } from "./draft";
import { recordSiteStoragePurge } from "./storageTelemetry";

type ReadCtx = QueryCtx | MutationCtx;

export async function readSiteDeletionManifest(
  ctx: ReadCtx,
  siteId: Id<"sites">,
) {
  const [domains, files, releases] = await Promise.all([
    ctx.db
      .query("siteDomains")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect(),
    ctx.db
      .query("files")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect(),
    ctx.db
      .query("siteReleases")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect(),
  ]);
  const releaseFiles = (
    await Promise.all(
      releases.map((release) =>
        ctx.db
          .query("releaseFiles")
          .withIndex("by_release", (q) => q.eq("releaseId", release._id))
          .collect(),
      ),
    )
  ).flat();
  return {
    hostnames: domains.map((domain) => domain.hostname),
    objectKeys: [
      ...new Set([...files, ...releaseFiles].map((file) => file.objectKey)),
    ],
  };
}

async function deleteRows(
  ctx: MutationCtx,
  rows: ReadonlyArray<{ _id: Id<TableNames> }>,
) {
  for (const row of rows) await ctx.db.delete(row._id);
}

export async function deleteSiteData(
  ctx: MutationCtx,
  siteId: Id<"sites">,
  options: { includeDomains: boolean },
) {
  const site = await ctx.db.get(siteId);
  if (!site) throw new Error("Site not found");
  assertDraftWritable(site);

  const domains = await ctx.db
    .query("siteDomains")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))
    .collect();
  if (!options.includeDomains && domains.length > 0) {
    throw new Error("Remove this site's custom domains before deleting it");
  }

  await recordSiteStoragePurge(ctx, {
    organizationId: site.organizationId,
    siteId,
    idempotencyKey: `site:purge:${siteId}`,
  });

  const libraries = await ctx.db
    .query("documentLibraries")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))
    .collect();
  for (const library of libraries) {
    await deleteRows(
      ctx,
      await ctx.db
        .query("documentFolders")
        .withIndex("by_parent", (q) => q.eq("libraryId", library._id))
        .collect(),
    );
  }

  const conversations = await ctx.db
    .query("siteAssistantConversations")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))
    .collect();
  for (const conversation of conversations) {
    const assistantRuns = await ctx.db
      .query("siteAssistantRuns")
      .withIndex("by_conversation_created", (q) =>
        q.eq("conversationId", conversation._id),
      )
      .collect();
    for (const run of assistantRuns) {
      await deleteRows(
        ctx,
        await ctx.db
          .query("siteAssistantGenerations")
          .withIndex("by_run", (q) => q.eq("runId", run._id))
          .collect(),
      );
      await deleteRows(
        ctx,
        await ctx.db
          .query("siteAssistantApplications")
          .withIndex("by_run", (q) => q.eq("runId", run._id))
          .collect(),
      );
    }
    await deleteRows(
      ctx,
      await ctx.db
        .query("siteAssistantEvents")
        .withIndex("by_conversation_created", (q) =>
          q.eq("conversationId", conversation._id),
        )
        .collect(),
    );
    await deleteRows(ctx, assistantRuns);
  }

  const releases = await ctx.db
    .query("siteReleases")
    .withIndex("by_site", (q) => q.eq("siteId", siteId))
    .collect();
  for (const release of releases) {
    const releaseRows = await Promise.all([
      ctx.db
        .query("releasePages")
        .withIndex("by_release", (q) => q.eq("releaseId", release._id))
        .collect(),
      ctx.db
        .query("releaseLibraries")
        .withIndex("by_release", (q) => q.eq("releaseId", release._id))
        .collect(),
      ctx.db
        .query("releaseFolders")
        .withIndex("by_release", (q) => q.eq("releaseId", release._id))
        .collect(),
      ctx.db
        .query("releaseFiles")
        .withIndex("by_release", (q) => q.eq("releaseId", release._id))
        .collect(),
      ctx.db
        .query("releaseChanges")
        .withIndex("by_release", (q) => q.eq("releaseId", release._id))
        .collect(),
    ]);
    for (const rows of releaseRows) await deleteRows(ctx, rows);
  }

  const siteRows = await Promise.all([
    ctx.db
      .query("files")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect(),
    ctx.db
      .query("searchEntries")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect(),
    ctx.db
      .query("fileExtractions")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect(),
    ctx.db
      .query("draftChanges")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect(),
    ctx.db
      .query("draftRestores")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect(),
    ctx.db
      .query("publicationEvents")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect(),
    ctx.db
      .query("pageDocuments")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect(),
    ctx.db
      .query("pages")
      .withIndex("by_site", (q) => q.eq("siteId", siteId))
      .collect(),
    ctx.db
      .query("contentRevisions")
      .withIndex("by_site_hash", (q) => q.eq("siteId", siteId))
      .collect(),
    ctx.db
      .query("contentPayloads")
      .withIndex("by_site_hash", (q) => q.eq("siteId", siteId))
      .collect(),
  ]);
  for (const rows of siteRows) await deleteRows(ctx, rows);
  await deleteRows(ctx, conversations);
  await deleteRows(ctx, releases);
  await deleteRows(ctx, libraries);
  if (options.includeDomains) await deleteRows(ctx, domains);
  await ctx.db.delete(siteId);
}
