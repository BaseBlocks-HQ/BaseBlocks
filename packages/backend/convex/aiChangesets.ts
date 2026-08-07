import { ConvexError, getConvexSize, v } from "convex/values";
import {
  fingerprintProjectPage,
  type OpenEditorProjectSnapshot,
} from "@openeditor/workspace";
import type { JsonObject } from "@openeditor/core";
import type { Id } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";
import {
  MAX_AI_CHANGESET_CONTENT_BYTES,
  MAX_AI_SITE_PAGES,
  assertAiWorkspaceRevision,
  planAiChangeset,
  type AiChangesetPlan,
  type AiPageOperation,
  type AiWorkspacePageSnapshot,
} from "./model/aiChangesetPlan";
import {
  MAX_AI_REFERENCE_FILES,
  MAX_AI_REFERENCE_LIBRARIES,
  aiSiteNameChanged,
  assertAiOperationEnvelope,
  assertBoundedFingerprintInput,
  assertWorkspaceMetadataSize,
  assertWorkspaceDocumentContentSize,
  assertWorkspacePageFields,
  assertWorkspaceReferenceCounts,
} from "./model/aiWorkspaceBounds";
import {
  assertAiWorkspaceFingerprints,
  fingerprintAiProjectTrustRoot,
} from "./model/aiWorkspaceFingerprint";
import { assertAiChangesetReferences } from "./model/aiChangesetReferences";
import { createAiChangesetResultDigest } from "./model/aiChangesetAudit";
import { assertAiChangesetCanRevert } from "./model/aiChangesetRevert";
import { assertDraftWritable } from "./model/draft";
import { assertActiveAiRunLease } from "./model/aiRunPolicy";
import { appendCompletedAssistantMessage } from "./aiConversations";
import {
  emptyOpenEditorDocument,
  hashOpenEditorContent,
  parseOpenEditorDocument,
  type OpenEditorDocument,
} from "./pageContentFormat";
import { requireOrganizationPermission } from "./permissions";
import {
  indexPageContent,
  queuePageContentIndex,
  removePageContentIndex,
} from "./search";
import { getOrCreateContentObject } from "./model/contentObjects";
import { readPageDocumentRecord } from "./model/pageDocuments";
import { reconcileDraftChanges } from "./model/draftChanges";
import { synchronizeParentDocument } from "./model/pageHierarchy";
import { aiRunTelemetry } from "./validators/ai";

const MAX_PAGE_CONTENT_BYTES = 900_000;

function jsonMetadata(value: unknown): JsonObject {
  return JSON.parse(JSON.stringify(value)) as JsonObject;
}

const pageOperation = v.union(
  v.object({
    kind: v.literal("create"),
    clientId: v.string(),
    parentRef: v.optional(v.union(v.string(), v.null())),
    title: v.string(),
    slug: v.string(),
    icon: v.optional(v.string()),
    order: v.number(),
    content: v.any(),
  }),
  v.object({
    kind: v.literal("update"),
    pageId: v.id("pages"),
    parentRef: v.optional(v.union(v.string(), v.null())),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    icon: v.optional(v.union(v.string(), v.null())),
    order: v.optional(v.number()),
    content: v.optional(v.any()),
  }),
  v.object({
    kind: v.literal("delete"),
    pageId: v.id("pages"),
  }),
);

const pageFingerprint = v.object({
  pageId: v.string(),
  expectedFingerprint: v.union(v.string(), v.null()),
  nextFingerprint: v.optional(v.string()),
});

function validationError(error: unknown): never {
  throw new ConvexError({
    code: "INVALID_AI_CHANGESET",
    message: error instanceof Error ? error.message : "Invalid AI changeset",
  });
}

function replaceCreatedPageReferences(
  value: unknown,
  createdPageIds: Map<string, Id<"pages">>,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) =>
      replaceCreatedPageReferences(item, createdPageIds),
    );
  }
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(record)) {
    result[key] = replaceCreatedPageReferences(child, createdPageIds);
  }
  if (
    record.type === "page" &&
    result.attrs &&
    typeof result.attrs === "object"
  ) {
    const attrs = { ...(result.attrs as Record<string, unknown>) };
    const replacement =
      typeof attrs.pageId === "string"
        ? createdPageIds.get(attrs.pageId)
        : undefined;
    if (replacement) attrs.pageId = replacement;
    result.attrs = attrs;
  }
  return result;
}

function resolvedPageRef(
  ctx: Pick<MutationCtx, "db">,
  ref: string | undefined,
  createdPageIds: Map<string, Id<"pages">>,
): Id<"pages"> | undefined {
  if (!ref) return undefined;
  const created = createdPageIds.get(ref);
  if (created) return created;
  const existing = ctx.db.normalizeId("pages", ref);
  if (!existing) throw new Error(`Invalid page reference ${ref}`);
  return existing;
}

async function writePageDocument(
  ctx: MutationCtx,
  input: {
    pageId: Id<"pages">;
    siteId: Id<"sites">;
    document: OpenEditorDocument;
    updatedAt: number;
  },
) {
  const serialized = JSON.stringify(input.document);
  const contentSize = getConvexSize(serialized);
  if (contentSize > MAX_PAGE_CONTENT_BYTES) {
    throw new Error(`Page ${input.pageId} exceeds the 900 KB content limit`);
  }
  const contentHash = hashOpenEditorContent(serialized);
  const existing = await ctx.db
    .query("pageDocuments")
    .withIndex("by_page", (q) => q.eq("pageId", input.pageId))
    .unique();
  if (existing && existing.contentHash === contentHash) {
    return {
      changed: false,
      contentHash: existing.contentHash,
      revisionId: existing.revisionId,
    };
  }

  const { revisionId } = await getOrCreateContentObject(ctx, {
    siteId: input.siteId,
    content: serialized,
    contentHash,
    contentSize,
    document: input.document,
    createdAt: input.updatedAt,
  });
  if (existing) {
    await ctx.db.patch(existing._id, {
      revisionId,
      contentHash,
      contentSize,
      updatedAt: input.updatedAt,
    });
  } else {
    await ctx.db.insert("pageDocuments", {
      siteId: input.siteId,
      pageId: input.pageId,
      revisionId,
      contentHash,
      contentSize,
      updatedAt: input.updatedAt,
    });
  }
  return { changed: true, contentHash, revisionId };
}

/**
 * Atomically apply a bounded, fully validated project changeset.
 *
 * Convex mutations are transactional: any validation or write failure rolls
 * the entire changeset back. The explicit operation/content limits keep the
 * transaction below the platform's mutation envelope; larger workspaces must
 * be reviewed and committed as multiple independently revisioned changesets.
 */
export const apply = mutation({
  args: {
    siteId: v.id("sites"),
    conversationId: v.optional(v.id("aiConversations")),
    summary: v.string(),
    expectedDraftRevision: v.number(),
    expectedContentHashes: v.array(
      v.object({
        pageId: v.id("pages"),
        contentHash: v.union(v.string(), v.null()),
      }),
    ),
    expectedProjectFingerprint: v.string(),
    expectedSiteFingerprint: v.string(),
    nextSiteFingerprint: v.string(),
    nextSiteName: v.string(),
    nextPageOrder: v.array(v.string()),
    pageFingerprints: v.array(pageFingerprint),
    operations: v.array(pageOperation),
    defaultPageRef: v.optional(v.string()),
    requestId: v.string(),
    telemetry: v.optional(aiRunTelemetry),
  },
  returns: v.object({
    draftRevision: v.number(),
    createdPages: v.array(
      v.object({ clientId: v.string(), pageId: v.id("pages") }),
    ),
    contentHashes: v.array(
      v.object({ pageId: v.id("pages"), contentHash: v.string() }),
    ),
    auditId: v.id("aiChangesetAudits"),
  }),
  handler: async (ctx, args) => {
    if (!args.summary.trim() || args.summary.length > 20_000) {
      throw new ConvexError("Invalid AI changeset summary");
    }
    const site = await ctx.db.get(args.siteId);
    if (!site) throw new ConvexError("Site not found");
    assertDraftWritable(site);
    const { auth } = await requireOrganizationPermission(
      ctx,
      site.organizationId,
      { resource: "content", action: "edit" },
    );
    const aiRun = await ctx.db
      .query("aiRuns")
      .withIndex("by_site_actor_request", (q) =>
        q
          .eq("siteId", site._id)
          .eq("actorId", auth.userId)
          .eq("requestId", args.requestId),
      )
      .unique();
    let fingerprintTrust:
      | Awaited<ReturnType<typeof assertAiWorkspaceFingerprints>>
      | undefined;
    let currentProjectForAudit: OpenEditorProjectSnapshot | undefined;
    try {
      if (aiRun?.mode !== "apply") {
        throw new Error("AI changeset does not belong to an apply run");
      }
      assertActiveAiRunLease(aiRun, Date.now());
    } catch (error) {
      throw new ConvexError({
        code: "AI_RUN_NOT_ADMITTED",
        message:
          error instanceof Error
            ? error.message
            : "AI changeset does not belong to an admitted apply run",
      });
    }
    try {
      assertAiWorkspaceRevision(
        site.draftRevision ?? 0,
        args.expectedDraftRevision,
      );
    } catch (error) {
      throw new ConvexError({
        code: "STALE_AI_WORKSPACE",
        message:
          error instanceof Error ? error.message : "The AI workspace is stale",
      });
    }
    if (args.requestId.length > 200) {
      validationError(new Error("Changeset audit metadata is too long"));
    }
    try {
      assertAiOperationEnvelope(
        args.operations.map((operation) => ({
          ...operation,
          pageId:
            operation.kind === "create" ? undefined : String(operation.pageId),
        })),
      );
      assertBoundedFingerprintInput({
        expectedProjectFingerprint: args.expectedProjectFingerprint,
        expectedSiteFingerprint: args.expectedSiteFingerprint,
        nextSiteFingerprint: args.nextSiteFingerprint,
        nextSiteName: args.nextSiteName,
        pageFingerprints: args.pageFingerprints,
        nextPageOrder: args.nextPageOrder,
        operations: args.operations.map((operation) => ({
          kind: operation.kind,
          ref:
            operation.kind === "create"
              ? operation.clientId
              : String(operation.pageId),
        })),
      });
    } catch (error) {
      validationError(error);
    }
    const siteNameChanged = aiSiteNameChanged(site.name, args.nextSiteName);
    if (siteNameChanged) {
      await requireOrganizationPermission(ctx, site.organizationId, {
        resource: "site",
        action: "manage",
      });
    }

    const [activePages, libraries, files] = await Promise.all([
      ctx.db
        .query("pages")
        .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .take(MAX_AI_SITE_PAGES + 1),
      ctx.db
        .query("documentLibraries")
        .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .take(MAX_AI_REFERENCE_LIBRARIES + 1),
      ctx.db
        .query("files")
        .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
        .filter((q) => q.eq(q.field("deletedAt"), undefined))
        .take(MAX_AI_REFERENCE_FILES + 1),
    ]);
    if (activePages.length > MAX_AI_SITE_PAGES) {
      validationError(
        new Error(
          `Site exceeds the ${MAX_AI_SITE_PAGES} page AI workspace limit`,
        ),
      );
    }
    const resultingPageCount = args.operations.reduce(
      (count, operation) =>
        count +
        (operation.kind === "create"
          ? 1
          : operation.kind === "delete"
            ? -1
            : 0),
      activePages.length,
    );
    if (resultingPageCount > MAX_AI_SITE_PAGES) {
      validationError(
        new Error(`Site would exceed the ${MAX_AI_SITE_PAGES} page capacity`),
      );
    }
    if (resultingPageCount < 1) {
      validationError(new Error("A site must contain at least one page"));
    }
    activePages.sort((a, b) => a.order - b.order || a._id.localeCompare(b._id));
    try {
      assertWorkspacePageFields(
        activePages.map((page) => ({
          pageId: String(page._id),
          parentId: page.parentId ? String(page.parentId) : undefined,
          title: page.title,
          slug: page.slug,
          icon: page.icon,
          order: page.order,
        })),
      );
      assertWorkspaceReferenceCounts({
        libraryCount: libraries.length,
        fileCount: files.length,
      });
      assertWorkspaceMetadataSize({
        site: {
          siteId: site._id,
          name: site.name,
          slug: site.slug,
          defaultPageId: site.defaultPageId,
          draftRevision: site.draftRevision ?? 0,
          settings: site.settings,
        },
        pages: activePages.map((page) => ({
          pageId: page._id,
          parentId: page.parentId,
          title: page.title,
          slug: page.slug,
          icon: page.icon,
          order: page.order,
        })),
        libraries,
        files,
      });
    } catch (error) {
      validationError(error);
    }
    const pageDocuments = await Promise.all(
      activePages.map((page) =>
        ctx.db
          .query("pageDocuments")
          .withIndex("by_page", (q) => q.eq("pageId", page._id))
          .unique(),
      ),
    );
    try {
      assertWorkspaceDocumentContentSize(pageDocuments);
    } catch (error) {
      validationError(error);
    }
    const documentByPageId = new Map(
      pageDocuments.flatMap((document) =>
        document ? [[document.pageId, document] as const] : [],
      ),
    );
    const documents = await Promise.all(
      pageDocuments.flatMap((document) =>
        document
          ? [
              readPageDocumentRecord(ctx, document).then(
                (value) => [document.pageId, value] as const,
              ),
            ]
          : [],
      ),
    );
    const contentByPageId = new Map(documents);
    const snapshots: AiWorkspacePageSnapshot[] = activePages.map((page) => {
      const record = documentByPageId.get(page._id);
      const document = contentByPageId.get(page._id);
      return {
        pageId: page._id,
        parentId: page.parentId,
        title: page.title,
        slug: page.slug,
        icon: page.icon,
        order: page.order,
        contentHash: record?.contentHash ?? null,
        document: document ?? emptyOpenEditorDocument(),
      };
    });

    let plan: AiChangesetPlan;
    try {
      plan = planAiChangeset({
        pages: snapshots,
        currentDefaultPageId: site.defaultPageId,
        expectedContentHashes: args.expectedContentHashes,
        operations: args.operations as AiPageOperation[],
        defaultPageRef: args.defaultPageRef,
        allowProjectOnlyChange:
          siteNameChanged ||
          (args.defaultPageRef !== undefined &&
            args.defaultPageRef !== String(site.defaultPageId)),
      });
    } catch (error) {
      validationError(error);
    }

    const parsedDocuments = new Map<string, OpenEditorDocument>();
    let changedContentBytes = 0;
    try {
      for (const page of plan.pages) {
        const parsed = parseOpenEditorDocument(page.document);
        parsedDocuments.set(page.ref, parsed);
        if (page.contentChanged) {
          const size = getConvexSize(JSON.stringify(parsed));
          if (size > MAX_PAGE_CONTENT_BYTES) {
            throw new Error(
              `Page ${page.ref} exceeds the 900 KB content limit`,
            );
          }
          changedContentBytes += size;
        }
      }
      if (changedContentBytes > MAX_AI_CHANGESET_CONTENT_BYTES) {
        throw new Error(
          `Changeset contains ${changedContentBytes} bytes of edited content; the atomic limit is ${MAX_AI_CHANGESET_CONTENT_BYTES}`,
        );
      }

      assertAiChangesetReferences({
        plan,
        documents: parsedDocuments,
        libraries: libraries.map((library) => ({
          libraryId: String(library._id),
        })),
        files: files.map((file) => ({
          fileId: String(file._id),
          kind: file.kind,
          libraryId: file.libraryId ? String(file.libraryId) : undefined,
        })),
      });

      const projectMetadata = jsonMetadata({
        defaultPageId: site.defaultPageId ?? null,
        siteSlug: site.slug,
        settings: site.settings,
        references: {
          libraries: libraries.map((library) => ({
            libraryId: library._id,
            name: library.name,
          })),
          files: files.map((file) => ({
            fileId: file._id,
            filename: file.filename,
            kind: file.kind,
            contentType: file.contentType,
            libraryId: file.libraryId,
          })),
        },
      });
      const currentProject: OpenEditorProjectSnapshot = {
        id: String(site._id),
        revision: String(site.draftRevision ?? 0),
        title: site.name,
        metadata: projectMetadata,
        pages: snapshots.map((page) => ({
          id: page.pageId,
          title: page.title,
          slug: page.slug,
          parentId: page.parentId ?? null,
          order: page.order,
          metadata: jsonMetadata({ icon: page.icon ?? null }),
          document: parseOpenEditorDocument(page.document),
        })),
      };
      currentProjectForAudit = currentProject;
      const nextProject: OpenEditorProjectSnapshot = {
        ...currentProject,
        title: args.nextSiteName,
        metadata: jsonMetadata({
          ...(projectMetadata as Record<string, unknown>),
          defaultPageId: plan.defaultPageRef,
        }),
        pages: (() => {
          if (args.nextPageOrder.length !== plan.pages.length) {
            throw new Error(
              "OpenEditor next-page order does not cover every active page",
            );
          }
          const pagesByRef = new Map(
            plan.pages.map((page) => [page.ref, page]),
          );
          const seen = new Set<string>();
          return args.nextPageOrder.map((pageRef) => {
            if (seen.has(pageRef)) {
              throw new Error(
                `Duplicate OpenEditor next-page reference ${pageRef}`,
              );
            }
            seen.add(pageRef);
            const page = pagesByRef.get(pageRef);
            if (!page) {
              throw new Error(
                `Unknown OpenEditor next-page reference ${pageRef}`,
              );
            }
            return {
              id: page.ref,
              title: page.title,
              slug: page.slug,
              parentId: page.parentId ?? null,
              order: page.order,
              metadata: jsonMetadata({ icon: page.icon ?? null }),
              document: parsedDocuments.get(page.ref)!,
            };
          });
        })(),
      };
      fingerprintTrust = await assertAiWorkspaceFingerprints({
        currentProject,
        nextProject,
        expectedProjectFingerprint: args.expectedProjectFingerprint,
        expectedSiteFingerprint: args.expectedSiteFingerprint,
        nextSiteFingerprint: args.nextSiteFingerprint,
        pageFingerprints: args.pageFingerprints,
      });
    } catch (error) {
      validationError(error);
    }
    if (!fingerprintTrust)
      validationError(new Error("Missing fingerprint trust result"));
    if (!currentProjectForAudit)
      validationError(new Error("Missing current project audit snapshot"));

    const snapshotByPageId = new Map(
      snapshots.map((snapshot) => [String(snapshot.pageId), snapshot]),
    );
    const plannedPageByRef = new Map(
      plan.pages.map((page) => [page.ref, page]),
    );
    const previousPages = args.operations.flatMap((operation) => {
      if (operation.kind === "create") return [];
      const pageId = String(operation.pageId);
      const snapshot = snapshotByPageId.get(pageId);
      if (!snapshot) throw new Error(`Missing rollback snapshot for ${pageId}`);
      const document = documentByPageId.get(operation.pageId);
      return [
        {
          pageId: operation.pageId,
          parentId: resolvedPageRef(ctx, snapshot.parentId, new Map()),
          title: snapshot.title,
          slug: snapshot.slug,
          icon: snapshot.icon,
          order: snapshot.order,
          restoreDocument:
            operation.kind === "delete" ||
            Boolean(plannedPageByRef.get(pageId)?.contentChanged),
          contentRevisionId: document?.revisionId,
        },
      ];
    });

    const now = Date.now();
    const parentsToSynchronize = new Set<Id<"pages">>(
      previousPages.flatMap((page) => (page.parentId ? [page.parentId] : [])),
    );
    const createdPageIds = new Map<string, Id<"pages">>();
    for (const operation of args.operations) {
      if (operation.kind !== "create") continue;
      const pageId = await ctx.db.insert("pages", {
        siteId: args.siteId,
        title: operation.title.trim(),
        slug: operation.slug.trim().toLowerCase(),
        icon: operation.icon,
        order: operation.order,
        createdBy: auth.userId,
        createdAt: now,
        updatedAt: now,
      });
      createdPageIds.set(operation.clientId, pageId);
    }

    const contentHashes: Array<{
      pageId: Id<"pages">;
      contentHash: string;
    }> = [];
    const updatedPageIds: Id<"pages">[] = [];
    for (const page of plan.pages) {
      const pageId = resolvedPageRef(ctx, page.ref, createdPageIds)!;
      const resolvedParentId = resolvedPageRef(
        ctx,
        page.parentId,
        createdPageIds,
      );
      if (resolvedParentId) parentsToSynchronize.add(resolvedParentId);
      if (page.metadataChanged) {
        await ctx.db.patch(pageId, {
          parentId: resolvedParentId,
          title: page.title,
          slug: page.slug,
          icon: page.icon,
          order: page.order,
          deletedAt: undefined,
          updatedAt: now,
        });
      }
      if (
        page.state === "existing" &&
        (page.metadataChanged || page.contentChanged)
      ) {
        updatedPageIds.push(pageId);
      }
      if (page.contentChanged) {
        const resolvedDocument = parseOpenEditorDocument(
          replaceCreatedPageReferences(
            parsedDocuments.get(page.ref)!,
            createdPageIds,
          ),
        );
        const result = await writePageDocument(ctx, {
          pageId,
          siteId: args.siteId,
          document: resolvedDocument,
          updatedAt: now,
        });
        contentHashes.push({ pageId, contentHash: result.contentHash });
        if (result.changed && result.revisionId) {
          await queuePageContentIndex(
            ctx,
            pageId,
            result.revisionId,
            result.contentHash,
          );
        }
      } else if (page.metadataChanged && page.state === "existing") {
        await indexPageContent(ctx, pageId);
      }
    }

    const deletedPageIds = plan.deletedPageIds.map((pageId) => {
      const normalized = ctx.db.normalizeId("pages", pageId);
      if (!normalized) throw new Error(`Invalid deleted page ${pageId}`);
      return normalized;
    });
    for (const pageId of deletedPageIds) {
      await ctx.db.patch(pageId, { deletedAt: now, updatedAt: now });
      await removePageContentIndex(ctx, pageId);
    }
    for (const parentId of parentsToSynchronize) {
      await synchronizeParentDocument(ctx, parentId, now, {
        touchDraft: false,
      });
    }

    const defaultPageId = resolvedPageRef(
      ctx,
      plan.defaultPageRef,
      createdPageIds,
    );
    if (!defaultPageId) throw new Error("Default page resolution failed");
    const draftRevision = (site.draftRevision ?? 0) + 1;
    await ctx.db.patch(site._id, {
      name: args.nextSiteName,
      defaultPageId,
      draftRevision,
      updatedAt: now,
    });
    const updatedSite = await ctx.db.get(site._id);
    if (!updatedSite) throw new Error("Site not found after changeset");
    await reconcileDraftChanges(
      ctx,
      updatedSite,
      [
        { entityType: "site", entityId: site._id },
        ...[
          ...createdPageIds.values(),
          ...updatedPageIds,
          ...deletedPageIds,
        ].map((entityId) => ({ entityType: "page" as const, entityId })),
      ],
      now,
    );
    const authoritativeProject: OpenEditorProjectSnapshot = {
      id: String(site._id),
      revision: String(draftRevision),
      title: args.nextSiteName,
      metadata: jsonMetadata({
        defaultPageId: String(defaultPageId),
        siteSlug: site.slug,
        settings: site.settings,
        references: {
          libraries: libraries.map((library) => ({
            libraryId: library._id,
            name: library.name,
          })),
          files: files.map((file) => ({
            fileId: file._id,
            filename: file.filename,
            kind: file.kind,
            contentType: file.contentType,
            libraryId: file.libraryId,
          })),
        },
      }),
      pages: args.nextPageOrder.map((pageRef) => {
        const page = plan.pages.find((candidate) => candidate.ref === pageRef);
        if (!page) throw new Error(`Missing authoritative page ${pageRef}`);
        return {
          id: String(resolvedPageRef(ctx, page.ref, createdPageIds)!),
          title: page.title,
          slug: page.slug,
          parentId: page.parentId
            ? String(resolvedPageRef(ctx, page.parentId, createdPageIds)!)
            : null,
          order: page.order,
          metadata: jsonMetadata({ icon: page.icon ?? null }),
          document: parseOpenEditorDocument(
            replaceCreatedPageReferences(
              parsedDocuments.get(page.ref)!,
              createdPageIds,
            ),
          ),
        };
      }),
    };
    const authoritativeTrust =
      await fingerprintAiProjectTrustRoot(authoritativeProject);
    const expectedPageFingerprints = await Promise.all(
      currentProjectForAudit.pages.map(async (page) => ({
        pageId: page.id,
        fingerprint: await fingerprintProjectPage(page),
      })),
    );
    const resultPageFingerprints = await Promise.all(
      authoritativeProject.pages.map(async (page) => ({
        pageId: page.id,
        fingerprint: await fingerprintProjectPage(page),
      })),
    );
    const resultDigest = createAiChangesetResultDigest({
      runId: String(aiRun._id),
      modelId: aiRun.modelId,
      expectedProjectFingerprint: fingerprintTrust.expectedProjectFingerprint,
      resultProjectFingerprint: authoritativeTrust.projectFingerprint,
      expectedSiteFingerprint: fingerprintTrust.expectedSiteFingerprint,
      resultSiteFingerprint: authoritativeTrust.siteFingerprint,
      expectedPageFingerprints,
      resultPageFingerprints,
      draftRevision,
      createdPageIds: [...createdPageIds.values()],
      updatedPageIds: [...new Set(updatedPageIds)],
      deletedPageIds,
      contentHashes,
    });
    const auditId = await ctx.db.insert("aiChangesetAudits", {
      siteId: site._id,
      runId: aiRun._id,
      actorId: auth.userId,
      requestId: args.requestId,
      executor: "workspace",
      modelId: aiRun.modelId,
      expectedProjectFingerprint: fingerprintTrust.expectedProjectFingerprint,
      resultProjectFingerprint: authoritativeTrust.projectFingerprint,
      expectedSiteFingerprint: fingerprintTrust.expectedSiteFingerprint,
      resultSiteFingerprint: authoritativeTrust.siteFingerprint,
      expectedPageFingerprints,
      resultPageFingerprints,
      resultDigest,
      previousSiteName: site.name,
      nextSiteName: args.nextSiteName,
      siteNameChanged,
      baseDraftRevision: site.draftRevision ?? 0,
      resultDraftRevision: draftRevision,
      operationCount: args.operations.length,
      createdPageIds: [...createdPageIds.values()],
      updatedPageIds: [...new Set(updatedPageIds)],
      deletedPageIds,
      createdAt: now,
    });
    await ctx.db.insert("aiChangesetReverts", {
      auditId,
      siteId: site._id,
      runId: aiRun._id,
      actorId: auth.userId,
      appliedDraftRevision: draftRevision,
      appliedSiteName: args.nextSiteName,
      appliedDefaultPageId: defaultPageId,
      previousSiteName: site.name,
      previousDefaultPageId: site.defaultPageId,
      createdPageIds: [...createdPageIds.values()],
      previousPages,
      createdAt: now,
    });

    const applied = {
      draftRevision,
      createdPages: [...createdPageIds].map(([clientId, pageId]) => ({
        clientId,
        pageId,
      })),
      contentHashes,
      auditId,
    };
    await ctx.db.patch(aiRun._id, {
      status: "completed",
      outcome: "applied",
      telemetry: args.telemetry,
      failureCode: undefined,
      failureMessage: undefined,
      result: {
        replayed: true,
        outcome: "applied",
        summary: args.summary,
        diagnostics: [],
        applied,
      },
      leaseExpiresAt: now,
      completedAt: now,
      updatedAt: now,
    });
    if (args.conversationId) {
      await appendCompletedAssistantMessage(ctx, {
        conversationId: args.conversationId,
        siteId: site._id,
        actorId: auth.userId,
        requestId: args.requestId,
        content: args.summary,
        operationCount: args.operations.length,
        auditId,
        createdAt: now,
      });
    }
    return applied;
  },
});

/**
 * Restore the exact site state that preceded an AI changeset.
 *
 * Reverts are deliberately stack-like: the site's latest unreverted AI
 * operation is restored first. Editor normalization and autosaves may advance
 * the draft revision after an agent run, so they do not invalidate undo.
 */
export const revert = mutation({
  args: {
    auditId: v.id("aiChangesetAudits"),
    messageId: v.id("aiConversationMessages"),
  },
  returns: v.object({ draftRevision: v.number(), revertedAt: v.number() }),
  handler: async (ctx, args) => {
    const [audit, rollback, message] = await Promise.all([
      ctx.db.get(args.auditId),
      ctx.db
        .query("aiChangesetReverts")
        .withIndex("by_audit", (q) => q.eq("auditId", args.auditId))
        .unique(),
      ctx.db.get(args.messageId),
    ]);
    if (!audit || !rollback)
      throw new ConvexError("AI change cannot be reverted");
    if (message?.role !== "assistant" || message.auditId !== audit._id) {
      throw new ConvexError("AI change does not belong to this message");
    }
    const site = await ctx.db.get(audit.siteId);
    if (!site) throw new ConvexError("Site not found");
    assertDraftWritable(site);
    const { auth } = await requireOrganizationPermission(
      ctx,
      site.organizationId,
      { resource: "content", action: "edit" },
    );
    if (
      rollback.actorId !== auth.userId ||
      message.actorId !== auth.userId ||
      message.siteId !== site._id
    ) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "AI change belongs to another user or site",
      });
    }
    const latestUnrevertedOperation = await ctx.db
      .query("aiChangesetReverts")
      .withIndex("by_site_created", (q) => q.eq("siteId", site._id))
      .filter((q) => q.eq(q.field("revertedAt"), undefined))
      .order("desc")
      .first();
    try {
      assertAiChangesetCanRevert({
        isLatestUnrevertedOperation:
          latestUnrevertedOperation?._id === rollback._id,
        revertedAt: rollback.revertedAt ?? message.revertedAt,
      });
    } catch (error) {
      throw new ConvexError({
        code: "STALE_AI_REVERT",
        message:
          error instanceof Error
            ? error.message
            : "AI change cannot be reverted",
      });
    }
    if (site.name !== rollback.previousSiteName) {
      await requireOrganizationPermission(ctx, site.organizationId, {
        resource: "site",
        action: "manage",
      });
    }

    const now = Date.now();
    const parentsToSynchronize = new Set<Id<"pages">>();
    for (const pageId of rollback.createdPageIds) {
      const page = await ctx.db.get(pageId);
      if (!page || page.siteId !== site._id) {
        throw new ConvexError("Created AI page is no longer available");
      }
      if (page.parentId) parentsToSynchronize.add(page.parentId);
      await ctx.db.patch(pageId, { deletedAt: now, updatedAt: now });
      await removePageContentIndex(ctx, pageId);
    }

    for (const previous of rollback.previousPages) {
      const page = await ctx.db.get(previous.pageId);
      if (!page || page.siteId !== site._id) {
        throw new ConvexError("Previous AI page is no longer available");
      }
      if (page.parentId) parentsToSynchronize.add(page.parentId);
      if (previous.parentId) parentsToSynchronize.add(previous.parentId);
      await ctx.db.patch(previous.pageId, {
        parentId: previous.parentId,
        title: previous.title,
        slug: previous.slug,
        icon: previous.icon,
        order: previous.order,
        deletedAt: undefined,
        updatedAt: now,
      });
      if (previous.restoreDocument) {
        const revision = previous.contentRevisionId
          ? await ctx.db.get(previous.contentRevisionId)
          : null;
        const payload = revision ? await ctx.db.get(revision.payloadId) : null;
        const document = payload
          ? parseOpenEditorDocument(payload.content)
          : emptyOpenEditorDocument();
        await writePageDocument(ctx, {
          pageId: previous.pageId,
          siteId: site._id,
          document,
          updatedAt: now,
        });
      }
      await indexPageContent(ctx, previous.pageId);
    }
    for (const parentId of parentsToSynchronize) {
      await synchronizeParentDocument(ctx, parentId, now, {
        touchDraft: false,
      });
    }

    const draftRevision = (site.draftRevision ?? 0) + 1;
    await ctx.db.patch(site._id, {
      name: rollback.previousSiteName,
      defaultPageId: rollback.previousDefaultPageId,
      draftRevision,
      updatedAt: now,
    });
    const updatedSite = await ctx.db.get(site._id);
    if (!updatedSite) throw new Error("Site not found after revert");
    await reconcileDraftChanges(
      ctx,
      updatedSite,
      [
        { entityType: "site", entityId: site._id },
        ...rollback.previousPages.map((page) => ({
          entityType: "page" as const,
          entityId: page.pageId,
        })),
        ...rollback.createdPageIds.map((entityId) => ({
          entityType: "page" as const,
          entityId,
        })),
      ],
      now,
    );
    await ctx.db.patch(rollback._id, {
      revertedAt: now,
      revertedBy: auth.userId,
      revertDraftRevision: draftRevision,
    });
    await ctx.db.patch(message._id, { revertedAt: now });
    return { draftRevision, revertedAt: now };
  },
});
