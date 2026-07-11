import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  internalAction,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import {
  getAuthOrganizationById,
  listAuthOrganizationMembers,
} from "./authComponent/model";
import {
  hydrateDeepBlockContent,
  serializeDeepBlockContent,
} from "./pageContent";
import { extractTextFromBlocks } from "./search";

const BATCH_SIZE = 25;

type MigrationStage = "ownership" | "pageContent" | "files" | "search";

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function canonicalBlockContent(type: string, content: unknown): unknown {
  if (
    type === "decision-tree" &&
    content &&
    typeof content === "object" &&
    "trees" in content &&
    "nodes" in content
  ) {
    // Early decision-tree writes duplicated the active tree in `nodes` and
    // `trees`. Current readers use only `trees`; retaining both also breaches
    // Convex's nesting limit once the block is embedded in pageContents.
    const { nodes: _legacyNodes, ...canonical } = content as Record<
      string,
      unknown
    >;
    return canonical;
  }
  return content;
}

async function recordStatus(
  ctx: MutationCtx,
  stage: MigrationStage,
  values: {
    cursor?: string;
    sourceCount: number;
    destinationCount: number;
    mismatchCount: number;
    completed?: boolean;
  },
) {
  const existing = await ctx.db
    .query("migrationStatus")
    .withIndex("by_stage", (q) => q.eq("stage", stage))
    .unique();
  const status = {
    stage,
    cursor: values.cursor,
    sourceCount: values.sourceCount,
    destinationCount: values.destinationCount,
    mismatchCount: values.mismatchCount,
    completedAt: values.completed ? Date.now() : undefined,
    updatedAt: Date.now(),
  };
  if (existing) await ctx.db.replace(existing._id, status);
  else await ctx.db.insert("migrationStatus", status);
}

export const migrateOwnership = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: v.object({
    checked: v.number(),
    patched: v.number(),
    conflicts: v.number(),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, { cursor }) => {
    const result = await ctx.db
      .query("sites")
      .paginate({ cursor: cursor ?? null, numItems: BATCH_SIZE });
    let patched = 0;
    let conflicts = 0;
    for (const site of result.page) {
      if (!site.teamId) {
        if (!site.organizationId)
          throw new Error(`Site ${site._id} has no ownership field`);
        continue;
      }
      const team = await ctx.db.get(site.teamId);
      if (!team?.organizationId)
        throw new Error(`Site ${site._id} has no mapped legacy team`);
      const organization = await getAuthOrganizationById(
        ctx,
        team.organizationId,
      );
      if (!organization)
        throw new Error(
          `Missing Better Auth organization ${team.organizationId}`,
        );
      if (site.organizationId && site.organizationId !== team.organizationId) {
        conflicts += 1;
        continue;
      }
      if (!site.organizationId) {
        await ctx.db.patch(site._id, { organizationId: team.organizationId });
        patched += 1;
      }
    }
    if (result.isDone) {
      const allSites = await ctx.db.query("sites").collect();
      const destinationCount = allSites.filter(
        (site) => site.organizationId,
      ).length;
      const mismatchCount = conflicts + (allSites.length - destinationCount);
      await recordStatus(ctx, "ownership", {
        sourceCount: allSites.length,
        destinationCount,
        mismatchCount,
        completed: mismatchCount === 0,
      });
    } else {
      await recordStatus(ctx, "ownership", {
        cursor: result.continueCursor,
        sourceCount: result.page.length,
        destinationCount: result.page.filter((site) => site.organizationId)
          .length,
        mismatchCount: conflicts,
      });
    }
    return {
      checked: result.page.length,
      patched,
      conflicts,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const migrationStatus = internalQuery({
  args: {},
  handler: async (ctx) => {
    const records = await ctx.db.query("migrationStatus").collect();
    const stages: MigrationStage[] = [
      "ownership",
      "pageContent",
      "files",
      "search",
    ];
    return stages.map((stage) => {
      const record = records.find((candidate) => candidate.stage === stage);
      return record
        ? {
            stage,
            cursor: record.cursor,
            sourceCount: record.sourceCount,
            destinationCount: record.destinationCount,
            mismatchCount: record.mismatchCount,
            completedAt: record.completedAt,
            updatedAt: record.updatedAt,
          }
        : {
            stage,
            sourceCount: 0,
            destinationCount: 0,
            mismatchCount: 0,
          };
    });
  },
});

export const verifyAuthorizationState = internalQuery({
  args: {},
  returns: v.object({
    sitesChecked: v.number(),
    legacyMembershipsChecked: v.number(),
    organizationsReferenced: v.number(),
    failures: v.object({
      sitesWithoutOwnership: v.number(),
      missingLegacyTeams: v.number(),
      teamsWithoutOrganizations: v.number(),
      missingAuthOrganizations: v.number(),
      conflictingOwnership: v.number(),
      missingAuthMemberships: v.number(),
      duplicateAuthMemberships: v.number(),
    }),
  }),
  handler: async (ctx) => {
    const [sites, members] = await Promise.all([
      ctx.db.query("sites").collect(),
      ctx.db.query("members").collect(),
    ]);
    let sitesWithoutOwnership = 0;
    let missingLegacyTeams = 0;
    let teamsWithoutOrganizations = 0;
    let missingAuthOrganizations = 0;
    let conflictingOwnership = 0;
    const organizationIds = new Set<string>();
    const teamOrganizations = new Map<string, string>();
    for (const site of sites) {
      if (!site.organizationId) sitesWithoutOwnership += 1;
      if (!site.teamId) continue;
      const team = await ctx.db.get(site.teamId);
      if (!team) {
        missingLegacyTeams += 1;
        continue;
      }
      if (!team.organizationId) {
        teamsWithoutOrganizations += 1;
        continue;
      }
      teamOrganizations.set(team._id, team.organizationId);
      organizationIds.add(team.organizationId);
      if (!(await getAuthOrganizationById(ctx, team.organizationId)))
        missingAuthOrganizations += 1;
      if (site.organizationId && site.organizationId !== team.organizationId)
        conflictingOwnership += 1;
    }
    let missingAuthMemberships = 0;
    let duplicateAuthMemberships = 0;
    const authMembersByOrganization = new Map<
      string,
      Awaited<ReturnType<typeof listAuthOrganizationMembers>>
    >();
    for (const member of members) {
      let organizationId = teamOrganizations.get(member.teamId);
      if (!organizationId) {
        const team = await ctx.db.get(member.teamId);
        organizationId = team?.organizationId;
        if (organizationId) {
          teamOrganizations.set(member.teamId, organizationId);
          organizationIds.add(organizationId);
        }
      }
      if (!organizationId) {
        missingAuthMemberships += 1;
        continue;
      }
      let authMembers = authMembersByOrganization.get(organizationId);
      if (!authMembers) {
        authMembers = await listAuthOrganizationMembers(ctx, organizationId);
        authMembersByOrganization.set(organizationId, authMembers);
      }
      const matches = authMembers.filter(
        (candidate) => candidate.userId === member.userId,
      );
      if (matches.length === 0) missingAuthMemberships += 1;
      if (matches.length > 1) duplicateAuthMemberships += matches.length - 1;
    }
    return {
      sitesChecked: sites.length,
      legacyMembershipsChecked: members.length,
      organizationsReferenced: organizationIds.size,
      failures: {
        sitesWithoutOwnership,
        missingLegacyTeams,
        teamsWithoutOrganizations,
        missingAuthOrganizations,
        conflictingOwnership,
        missingAuthMemberships,
        duplicateAuthMemberships,
      },
    };
  },
});

async function buildLegacyContent(
  ctx: Pick<QueryCtx | MutationCtx, "db">,
  page: Doc<"pages">,
) {
  const [sections, columns, blocks] = await Promise.all([
    ctx.db
      .query("sections")
      .withIndex("by_page", (q) => q.eq("pageId", page._id))
      .collect(),
    ctx.db
      .query("columns")
      .withIndex("by_page", (q) => q.eq("pageId", page._id))
      .collect(),
    ctx.db
      .query("blocks")
      .withIndex("by_page", (q) => q.eq("pageId", page._id))
      .collect(),
  ]);

  const legacyPage = page as Doc<"pages"> & {
    pageTabs?: Array<{ id: string; label: string }>;
  };
  const content = {
    tabs: legacyPage.pageTabs ?? [],
    sections: sections
      .sort((a, b) => a.order - b.order)
      .map((section, sectionOrder) => ({
        id: section._id as string,
        tabId: section.tabId,
        region: section.region,
        order: sectionOrder,
        columns: columns
          .filter((column) => column.sectionId === section._id)
          .sort((a, b) => a.order - b.order)
          .map((column, columnOrder) => ({
            id: column._id as string,
            order: columnOrder,
            blocks: blocks
              .filter((block) => block.columnId === column._id)
              .sort((a, b) => a.order - b.order)
              .map((block, blockOrder) => ({
                id: block._id as string,
                type: block.type,
                content: canonicalBlockContent(block.type, block.content),
                order: blockOrder,
              })),
          })),
      })),
  };
  return {
    ...content,
    sections: serializeDeepBlockContent(content.sections),
  };
}

export const migratePageContents = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: v.object({
    processed: v.number(),
    created: v.number(),
    skipped: v.number(),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, { cursor }) => {
    const result = await ctx.db
      .query("pages")
      .paginate({ cursor: cursor ?? null, numItems: BATCH_SIZE });
    let created = 0;
    let skipped = 0;

    for (const page of result.page) {
      const content = await buildLegacyContent(ctx, page);
      const existing = await ctx.db
        .query("pageContents")
        .withIndex("by_page", (q) => q.eq("pageId", page._id))
        .unique();
      const updatedAt = Date.now();
      if (existing) {
        if (existing.siteId !== page.siteId) {
          throw new Error(`Existing page content mismatch for ${page._id}`);
        }
        const actualStored = {
          tabs: existing.tabs,
          sections: existing.sections,
        };
        if (stableJson(actualStored) !== stableJson(content)) {
          const actualHydrated = {
            tabs: existing.tabs,
            sections: hydrateDeepBlockContent(existing.sections),
          };
          const expectedHydrated = {
            tabs: content.tabs,
            sections: hydrateDeepBlockContent(content.sections),
          };
          if (stableJson(actualHydrated) !== stableJson(expectedHydrated))
            throw new Error(`Existing page content mismatch for ${page._id}`);
          await ctx.db.patch(existing._id, { sections: content.sections });
        }
        skipped += 1;
      } else {
        await ctx.db.insert("pageContents", {
          siteId: page.siteId,
          pageId: page._id,
          ...content,
          updatedAt,
        });
        created += 1;
      }
    }

    if (!result.isDone) {
      await ctx.scheduler.runAfter(0, internal.migrations.migratePageContents, {
        cursor: result.continueCursor,
      });
    } else {
      const [allPages, allContents] = await Promise.all([
        ctx.db.query("pages").collect(),
        ctx.db.query("pageContents").collect(),
      ]);
      const uniquePageIds = new Set(allContents.map((item) => item.pageId));
      const mismatches =
        allPages.filter((item) => !uniquePageIds.has(item._id)).length +
        (allContents.length - uniquePageIds.size);
      await recordStatus(ctx, "pageContent", {
        sourceCount: allPages.length,
        destinationCount: allContents.length,
        mismatchCount: mismatches,
        completed: mismatches === 0,
      });
    }

    return {
      processed: result.page.length,
      created,
      skipped,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const verifyPageContents = internalQuery({
  args: { cursor: v.optional(v.string()) },
  returns: v.object({
    checked: v.number(),
    missing: v.array(v.id("pages")),
    mismatched: v.array(v.id("pages")),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, { cursor }) => {
    const result = await ctx.db
      .query("pages")
      .paginate({ cursor: cursor ?? null, numItems: BATCH_SIZE });
    const missing: Array<Id<"pages">> = [];
    const mismatched: Array<Id<"pages">> = [];

    for (const page of result.page) {
      const expected = await buildLegacyContent(ctx, page);
      const actual = await ctx.db
        .query("pageContents")
        .withIndex("by_page", (q) => q.eq("pageId", page._id))
        .unique();
      if (!actual) {
        missing.push(page._id);
      } else if (
        stableJson({ tabs: actual.tabs, sections: actual.sections }) !==
        stableJson(expected)
      ) {
        mismatched.push(page._id);
      }
    }

    return {
      checked: result.page.length,
      missing,
      mismatched,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const verifyHydratedPageContents = internalQuery({
  args: {},
  returns: v.object({
    pagesChecked: v.number(),
    blocksChecked: v.number(),
    richTextBlocks: v.number(),
    decisionTreeBlocks: v.number(),
    serializedPayloads: v.number(),
    hydrationMismatches: v.number(),
  }),
  handler: async (ctx) => {
    const pages = await ctx.db.query("pages").collect();
    let blocksChecked = 0;
    let richTextBlocks = 0;
    let decisionTreeBlocks = 0;
    let serializedPayloads = 0;
    let hydrationMismatches = 0;
    for (const page of pages) {
      const expectedStored = await buildLegacyContent(ctx, page);
      const actual = await ctx.db
        .query("pageContents")
        .withIndex("by_page", (q) => q.eq("pageId", page._id))
        .unique();
      if (!actual) {
        hydrationMismatches += 1;
        continue;
      }
      const actualHydrated = hydrateDeepBlockContent(actual.sections);
      const expectedHydrated = hydrateDeepBlockContent(expectedStored.sections);
      if (stableJson(actualHydrated) !== stableJson(expectedHydrated))
        hydrationMismatches += 1;
      for (const section of actual.sections)
        for (const column of section.columns)
          for (const block of column.blocks) {
            blocksChecked += 1;
            if (block.type === "richtext") richTextBlocks += 1;
            if (block.type === "decision-tree") decisionTreeBlocks += 1;
            if (
              block.content &&
              typeof block.content === "object" &&
              "__baseblocksSerializedContent" in block.content
            )
              serializedPayloads += 1;
          }
    }
    return {
      pagesChecked: pages.length,
      blocksChecked,
      richTextBlocks,
      decisionTreeBlocks,
      serializedPayloads,
      hydrationMismatches,
    };
  },
});

export const migrateSearchEntries = internalMutation({
  args: {
    kind: v.union(v.literal("page"), v.literal("document")),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    processed: v.number(),
    created: v.number(),
    matched: v.number(),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, { kind, cursor }) => {
    const result =
      kind === "page"
        ? await ctx.db
            .query("pages")
            .paginate({ cursor: cursor ?? null, numItems: BATCH_SIZE })
        : await ctx.db
            .query("documents")
            .paginate({ cursor: cursor ?? null, numItems: BATCH_SIZE });
    let created = 0;
    let matched = 0;
    for (const source of result.page) {
      let expected: {
        siteId: Id<"sites">;
        kind: "page" | "document";
        sourceId: string;
        title: string;
        text: string;
        updatedAt: number;
      };
      if (kind === "page" && "title" in source) {
        const content = await ctx.db
          .query("pageContents")
          .withIndex("by_page", (q) => q.eq("pageId", source._id))
          .unique();
        if (!content)
          throw new Error(
            `Missing page content for search source ${source._id}`,
          );
        const blocks = hydrateDeepBlockContent(content.sections).flatMap(
          (section) => section.columns.flatMap((column) => column.blocks),
        );
        expected = {
          siteId: source.siteId,
          kind,
          sourceId: source._id,
          title: source.title,
          text: `${source.title} ${extractTextFromBlocks(blocks)}`.trim(),
          updatedAt: Math.max(source.updatedAt, content.updatedAt),
        };
      } else if (kind === "document" && "filename" in source) {
        if (!source.fileId)
          throw new Error(`Missing file for search source ${source._id}`);
        const file = await ctx.db.get(source.fileId);
        if (!file)
          throw new Error(`Dangling file for search source ${source._id}`);
        expected = {
          siteId: source.siteId,
          kind,
          sourceId: source._id,
          title: source.filename,
          text: source.filename,
          updatedAt: Math.max(source.createdAt, file.createdAt),
        };
      } else {
        throw new Error(`Unexpected ${kind} search source`);
      }
      const existing = await ctx.db
        .query("searchEntries")
        .withIndex("by_source", (q) =>
          q.eq("kind", kind).eq("sourceId", source._id),
        )
        .collect();
      if (existing.length > 1)
        throw new Error(`Duplicate canonical search source ${source._id}`);
      if (existing[0]) {
        const actual = existing[0];
        if (
          stableJson({
            siteId: actual.siteId,
            kind: actual.kind,
            sourceId: actual.sourceId,
            title: actual.title,
            text: actual.text,
            updatedAt: actual.updatedAt,
          }) !== stableJson(expected)
        )
          throw new Error(`Canonical search mismatch for ${source._id}`);
        matched += 1;
      } else {
        await ctx.db.insert("searchEntries", expected);
        created += 1;
      }
    }
    if (result.isDone) {
      const [pages, documents, entries] = await Promise.all([
        ctx.db.query("pages").collect(),
        ctx.db.query("documents").collect(),
        ctx.db.query("searchEntries").collect(),
      ]);
      const expected = pages.length + documents.length;
      const keys = new Set(
        entries.map((entry) => `${entry.kind}:${entry.sourceId}`),
      );
      const mismatches =
        Math.abs(expected - entries.length) + (entries.length - keys.size);
      await recordStatus(ctx, "search", {
        sourceCount: expected,
        destinationCount: entries.length,
        mismatchCount: mismatches,
        completed: kind === "document" && mismatches === 0,
      });
    }
    return {
      processed: result.page.length,
      created,
      matched,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const verifyCanonicalState = internalQuery({
  args: {},
  returns: v.object({
    counts: v.object({
      teams: v.number(),
      members: v.number(),
      sites: v.number(),
      pages: v.number(),
      pageContents: v.number(),
      assets: v.number(),
      files: v.number(),
      documents: v.number(),
      legacySearch: v.number(),
      canonicalSearch: v.number(),
    }),
    failures: v.object({
      sitesWithoutOrganization: v.number(),
      conflictingOwnership: v.number(),
      missingPageContents: v.number(),
      duplicatePageContents: v.number(),
      mismatchedPageContents: v.number(),
      duplicateLegacyAssetMappings: v.number(),
      duplicateObjectKeys: v.number(),
      documentsWithoutFiles: v.number(),
      danglingDocumentFiles: v.number(),
      sitesWithoutLogoFiles: v.number(),
      searchWithoutFiles: v.number(),
      duplicateSearchEntries: v.number(),
      orphanedSearchEntries: v.number(),
    }),
  }),
  handler: async (ctx) => {
    const [
      teams,
      members,
      sites,
      pages,
      contents,
      assets,
      files,
      documents,
      legacySearch,
      canonicalSearch,
    ] = await Promise.all([
      ctx.db.query("teams").collect(),
      ctx.db.query("members").collect(),
      ctx.db.query("sites").collect(),
      ctx.db.query("pages").collect(),
      ctx.db.query("pageContents").collect(),
      ctx.db.query("assets").collect(),
      ctx.db.query("files").collect(),
      ctx.db.query("documents").collect(),
      ctx.db.query("searchableContent").collect(),
      ctx.db.query("searchEntries").collect(),
    ]);
    let conflictingOwnership = 0;
    for (const site of sites) {
      if (!site.teamId || !site.organizationId) continue;
      const team = await ctx.db.get(site.teamId);
      if (team?.organizationId !== site.organizationId)
        conflictingOwnership += 1;
    }
    const contentCounts = new Map<string, number>();
    for (const content of contents)
      contentCounts.set(
        content.pageId,
        (contentCounts.get(content.pageId) ?? 0) + 1,
      );
    let mismatchedPageContents = 0;
    for (const page of pages) {
      const expected = await buildLegacyContent(ctx, page);
      const actual = contents.find((content) => content.pageId === page._id);
      if (
        actual &&
        (actual.siteId !== page.siteId ||
          stableJson({ tabs: actual.tabs, sections: actual.sections }) !==
            stableJson(expected))
      )
        mismatchedPageContents += 1;
    }
    const duplicateCount = (values: Array<string | undefined>) => {
      const seen = new Set<string>();
      let duplicates = 0;
      for (const value of values) {
        if (!value) continue;
        if (seen.has(value)) duplicates += 1;
        else seen.add(value);
      }
      return duplicates;
    };
    const searchKeys = canonicalSearch.map(
      (entry) => `${entry.kind}:${entry.sourceId}`,
    );
    const pageIds = new Set(pages.map((page) => page._id as string));
    const documentIds = new Set(
      documents.map((document) => document._id as string),
    );
    return {
      counts: {
        teams: teams.length,
        members: members.length,
        sites: sites.length,
        pages: pages.length,
        pageContents: contents.length,
        assets: assets.length,
        files: files.length,
        documents: documents.length,
        legacySearch: legacySearch.length,
        canonicalSearch: canonicalSearch.length,
      },
      failures: {
        sitesWithoutOrganization: sites.filter((site) => !site.organizationId)
          .length,
        conflictingOwnership,
        missingPageContents: pages.filter(
          (page) => !contentCounts.has(page._id),
        ).length,
        duplicatePageContents: [...contentCounts.values()].filter(
          (count) => count > 1,
        ).length,
        mismatchedPageContents,
        duplicateLegacyAssetMappings: duplicateCount(
          files.map((file) => file.legacyAssetId as string | undefined),
        ),
        duplicateObjectKeys: duplicateCount(
          files.map((file) => file.objectKey),
        ),
        documentsWithoutFiles: documents.filter((document) => !document.fileId)
          .length,
        danglingDocumentFiles: documents.filter(
          (document) =>
            document.fileId &&
            !files.some((file) => file._id === document.fileId),
        ).length,
        sitesWithoutLogoFiles: sites.filter(
          (site) => site.logoAssetId && !site.logoFileId,
        ).length,
        searchWithoutFiles: legacySearch.filter(
          (entry) => entry.metadata.assetId && !entry.metadata.fileId,
        ).length,
        duplicateSearchEntries: duplicateCount(searchKeys),
        orphanedSearchEntries: canonicalSearch.filter((entry) =>
          entry.kind === "page"
            ? !pageIds.has(entry.sourceId)
            : !documentIds.has(entry.sourceId),
        ).length,
      },
    };
  },
});

const batchSize = 100;

const stageResult = v.object({
  processed: v.number(),
  done: v.boolean(),
  cursor: v.string(),
});

export const phase5CopyAssets = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: stageResult,
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db
      .query("assets")
      .paginate({ cursor: cursor ?? null, numItems: batchSize });
    let processed = 0;
    for (const asset of page.page) {
      const byLegacyAsset = await ctx.db
        .query("files")
        .withIndex("by_legacy_asset", (q) => q.eq("legacyAssetId", asset._id))
        .collect();
      if (byLegacyAsset.length > 1)
        throw new Error(`Duplicate migrated files for asset ${asset._id}`);
      const byObjectKey = await ctx.db
        .query("files")
        .withIndex("by_object_key", (q) => q.eq("objectKey", asset.objectKey))
        .collect();
      if (byObjectKey.length > 1)
        throw new Error(`Duplicate files for object key ${asset.objectKey}`);
      const existing = byLegacyAsset[0] ?? byObjectKey[0];
      if (existing) {
        const expected = {
          siteId: asset.siteId,
          kind: asset.kind,
          visibility: asset.visibility,
          objectKey: asset.objectKey,
          filename: asset.filename,
          contentType: asset.contentType,
          size: asset.size,
          checksum: asset.checksum,
          uploadedBy: asset.uploadedBy,
          createdAt: asset.createdAt,
          legacyAssetId: asset._id,
        };
        if (
          stableJson({
            siteId: existing.siteId,
            kind: existing.kind,
            visibility: existing.visibility,
            objectKey: existing.objectKey,
            filename: existing.filename,
            contentType: existing.contentType,
            size: existing.size,
            checksum: existing.checksum,
            uploadedBy: existing.uploadedBy,
            createdAt: existing.createdAt,
            legacyAssetId: existing.legacyAssetId,
          }) !== stableJson(expected)
        )
          throw new Error(`Existing file mismatch for asset ${asset._id}`);
        continue;
      }
      await ctx.db.insert("files", {
        siteId: asset.siteId,
        kind: asset.kind,
        visibility: asset.visibility,
        objectKey: asset.objectKey,
        filename: asset.filename,
        contentType: asset.contentType,
        size: asset.size,
        checksum: asset.checksum,
        uploadedBy: asset.uploadedBy,
        createdAt: asset.createdAt,
        legacyAssetId: asset._id,
      });
      processed += 1;
    }
    return { processed, done: page.isDone, cursor: page.continueCursor };
  },
});

export const phase5PatchDocuments = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: stageResult,
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db
      .query("documents")
      .paginate({ cursor: cursor ?? null, numItems: batchSize });
    let processed = 0;
    for (const document of page.page) {
      if (!document.assetId) {
        if (!document.fileId)
          throw new Error(`Document ${document._id} has no file reference`);
        continue;
      }
      const file = await ctx.db
        .query("files")
        .withIndex("by_legacy_asset", (q) =>
          q.eq("legacyAssetId", document.assetId),
        )
        .unique();
      if (!file)
        throw new Error(`Missing migrated file for document ${document._id}`);
      if (document.fileId && document.fileId !== file._id)
        throw new Error(`Conflicting file for document ${document._id}`);
      if (document.fileId) continue;
      await ctx.db.patch(document._id, { fileId: file._id });
      processed += 1;
    }
    return { processed, done: page.isDone, cursor: page.continueCursor };
  },
});

export const phase5PatchSites = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: stageResult,
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db
      .query("sites")
      .paginate({ cursor: cursor ?? null, numItems: batchSize });
    let processed = 0;
    for (const site of page.page) {
      if (!site.logoAssetId) continue;
      const file = await ctx.db
        .query("files")
        .withIndex("by_legacy_asset", (q) =>
          q.eq("legacyAssetId", site.logoAssetId),
        )
        .unique();
      if (!file) throw new Error(`Missing migrated logo for site ${site._id}`);
      if (site.logoFileId && site.logoFileId !== file._id)
        throw new Error(`Conflicting logo file for site ${site._id}`);
      if (site.logoFileId) continue;
      await ctx.db.patch(site._id, { logoFileId: file._id });
      processed += 1;
    }
    return { processed, done: page.isDone, cursor: page.continueCursor };
  },
});

export const phase5PatchSearch = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: stageResult,
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db
      .query("searchableContent")
      .paginate({ cursor: cursor ?? null, numItems: batchSize });
    let processed = 0;
    for (const entry of page.page) {
      const legacyId = entry.metadata.assetId;
      if (!legacyId) continue;
      const file = await ctx.db
        .query("files")
        .withIndex("by_legacy_asset", (q) => q.eq("legacyAssetId", legacyId))
        .unique();
      if (!file)
        throw new Error(`Missing migrated search file for ${entry._id}`);
      if (entry.metadata.fileId && entry.metadata.fileId !== file._id)
        throw new Error(`Conflicting search file for ${entry._id}`);
      if (entry.metadata.fileId) continue;
      await ctx.db.patch(entry._id, {
        metadata: { ...entry.metadata, fileId: file._id },
      });
      processed += 1;
    }
    if (page.isDone) {
      const [assets, files, documents, sites, entries] = await Promise.all([
        ctx.db.query("assets").collect(),
        ctx.db.query("files").collect(),
        ctx.db.query("documents").collect(),
        ctx.db.query("sites").collect(),
        ctx.db.query("searchableContent").collect(),
      ]);
      const mismatches =
        Math.abs(assets.length - files.length) +
        documents.filter((item) => item.assetId && !item.fileId).length +
        sites.filter((item) => item.logoAssetId && !item.logoFileId).length +
        entries.filter((item) => item.metadata.assetId && !item.metadata.fileId)
          .length;
      await recordStatus(ctx, "files", {
        sourceCount: assets.length,
        destinationCount: files.length,
        mismatchCount: mismatches,
        completed: mismatches === 0,
      });
    }
    return { processed, done: page.isDone, cursor: page.continueCursor };
  },
});

export const phase5Verify = internalQuery({
  args: {},
  returns: v.object({
    assets: v.number(),
    migratedFiles: v.number(),
    unmigratedDocuments: v.number(),
    unmigratedSites: v.number(),
    unmigratedSearchEntries: v.number(),
    danglingDocumentFiles: v.number(),
  }),
  handler: async (ctx) => {
    const [assets, files, documents, sites, entries] = await Promise.all([
      ctx.db.query("assets").collect(),
      ctx.db.query("files").collect(),
      ctx.db.query("documents").collect(),
      ctx.db.query("sites").collect(),
      ctx.db.query("searchableContent").collect(),
    ]);
    let danglingDocumentFiles = 0;
    for (const document of documents) {
      if (document.fileId && !(await ctx.db.get(document.fileId))) {
        danglingDocumentFiles += 1;
      }
    }
    return {
      assets: assets.length,
      migratedFiles: files.filter((file) => file.legacyAssetId).length,
      unmigratedDocuments: documents.filter((doc) => doc.assetId && !doc.fileId)
        .length,
      unmigratedSites: sites.filter(
        (site) => site.logoAssetId && !site.logoFileId,
      ).length,
      unmigratedSearchEntries: entries.filter(
        (entry) => entry.metadata.assetId && !entry.metadata.fileId,
      ).length,
      danglingDocumentFiles,
    };
  },
});

export const phase5Run = internalAction({
  args: {},
  returns: v.object({
    copiedAssets: v.number(),
    patchedDocuments: v.number(),
    patchedSites: v.number(),
    patchedSearchEntries: v.number(),
  }),
  handler: async (ctx) => {
    const stages = [
      internal.migrations.phase5CopyAssets,
      internal.migrations.phase5PatchDocuments,
      internal.migrations.phase5PatchSites,
      internal.migrations.phase5PatchSearch,
    ] as const;
    const totals: number[] = [];
    for (const stage of stages) {
      let cursor: string | undefined;
      let processed = 0;
      while (true) {
        const result = await ctx.runMutation(stage, { cursor });
        processed += result.processed;
        if (result.done) break;
        cursor = result.cursor;
      }
      totals.push(processed);
    }
    return {
      copiedAssets: totals[0] ?? 0,
      patchedDocuments: totals[1] ?? 0,
      patchedSites: totals[2] ?? 0,
      patchedSearchEntries: totals[3] ?? 0,
    };
  },
});
