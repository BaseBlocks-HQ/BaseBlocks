import type {
  JsonObject,
  JsonValue,
  OpenEditorDocument,
} from "@openeditor/core";
import type {
  OpenEditorProjectPage,
  OpenEditorProjectSnapshot,
  ProjectChangeset,
} from "@openeditor/workspace";
import { z } from "zod";
import type {
  BaseBlocksApplyChangesetInput,
  BaseBlocksWorkspaceSnapshot,
} from "./types";

const documentSchema = z
  .object({
    type: z.literal("doc"),
    version: z.literal(1),
    content: z.array(z.unknown()),
  })
  .passthrough();

const workspaceSchema = z.object({
  format: z.literal("openeditor-workspace"),
  version: z.literal(1),
  site: z.object({
    siteId: z.string().min(1),
    name: z.string(),
    slug: z.string(),
    defaultPageId: z.string().optional(),
    draftRevision: z.number().int().nonnegative(),
    settings: z.unknown(),
  }),
  pages: z
    .array(
      z.object({
        pageId: z.string().min(1),
        parentId: z.string().optional(),
        title: z.string(),
        slug: z.string(),
        icon: z.string().optional(),
        order: z.number().int().nonnegative(),
        contentHash: z.string().nullable(),
        document: documentSchema,
      }),
    )
    .max(500),
  references: z.object({
    libraries: z.array(
      z.object({ libraryId: z.string().min(1), name: z.string() }),
    ),
    files: z.array(
      z.object({
        fileId: z.string().min(1),
        filename: z.string(),
        kind: z.enum(["file", "siteAsset"]),
        contentType: z.string(),
        libraryId: z.string().optional(),
      }),
    ),
  }),
  trust: z.object({
    projectFingerprint: z.string().min(1),
    siteFingerprint: z.string().min(1),
    pageFingerprints: z
      .array(
        z.object({
          pageId: z.string().min(1),
          fingerprint: z.string().min(1),
        }),
      )
      .max(500),
  }),
});

function jsonMetadata(value: unknown): JsonObject {
  return JSON.parse(JSON.stringify(value)) as JsonObject;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function parseBaseBlocksWorkspaceSnapshot(
  value: unknown,
): BaseBlocksWorkspaceSnapshot {
  return workspaceSchema.parse(value) as BaseBlocksWorkspaceSnapshot;
}

export function toOpenEditorProject(
  snapshot: BaseBlocksWorkspaceSnapshot,
): OpenEditorProjectSnapshot {
  return {
    id: snapshot.site.siteId,
    revision: String(snapshot.site.draftRevision),
    title: snapshot.site.name,
    metadata: jsonMetadata({
      defaultPageId: snapshot.site.defaultPageId ?? null,
      siteSlug: snapshot.site.slug,
      settings: snapshot.site.settings,
      references: snapshot.references,
    }),
    pages: snapshot.pages.map(
      (page): OpenEditorProjectPage => ({
        id: page.pageId,
        title: page.title,
        slug: page.slug,
        parentId: page.parentId ?? null,
        order: page.order,
        metadata: jsonMetadata({ icon: page.icon ?? null }),
        document: page.document as OpenEditorDocument,
      }),
    ),
  };
}

function optionalString(value: JsonValue | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export async function toBaseBlocksChangeset(input: {
  snapshot: BaseBlocksWorkspaceSnapshot;
  changeset: ProjectChangeset;
  requestId: string;
  summary: string;
}): Promise<BaseBlocksApplyChangesetInput> {
  const nextMetadata = input.changeset.nextProject.metadata;
  const expectedImmutableMetadata = {
    siteSlug: input.snapshot.site.slug,
    settings: input.snapshot.site.settings,
    references: input.snapshot.references,
  };
  const actualImmutableMetadata = {
    siteSlug: nextMetadata?.siteSlug,
    settings: nextMetadata?.settings,
    references: nextMetadata?.references,
  };
  if (
    canonicalJson(actualImmutableMetadata) !==
    canonicalJson(expectedImmutableMetadata)
  ) {
    throw new Error(
      "BaseBlocks AI changesets may only change defaultPageId in project metadata",
    );
  }
  const hashes = new Map(
    input.snapshot.pages.map((page) => [page.pageId, page.contentHash]),
  );
  const authoritativePageFingerprints = new Map(
    input.snapshot.trust.pageFingerprints.map((page) => [
      page.pageId,
      page.fingerprint,
    ]),
  );
  const expectedContentHashes: BaseBlocksApplyChangesetInput["expectedContentHashes"] =
    [];
  const operations: BaseBlocksApplyChangesetInput["operations"] = [];

  for (const change of input.changeset.pageChanges) {
    if (change.kind === "create") {
      operations.push({
        kind: "create",
        clientId: change.pageId,
        parentRef: change.next.parentId,
        title: change.next.title,
        slug: change.next.slug ?? change.pageId,
        icon: optionalString(change.next.metadata?.icon),
        order: change.next.order ?? 0,
        content: change.next.document,
      });
      continue;
    }
    expectedContentHashes.push({
      pageId: change.pageId,
      contentHash: hashes.get(change.pageId) ?? null,
    });
    if (change.kind === "delete") {
      operations.push({ kind: "delete", pageId: change.pageId });
      continue;
    }
    operations.push({
      kind: "update",
      pageId: change.pageId,
      parentRef: change.next.parentId,
      title: change.next.title,
      slug: change.next.slug,
      icon: optionalString(change.next.metadata?.icon) ?? null,
      order: change.next.order,
      content: change.next.document,
    });
  }

  const defaultPageValue = input.changeset.nextProject.metadata?.defaultPageId;
  const pageFingerprints = await Promise.all(
    input.changeset.pageChanges.map(async (change) => {
      if (change.kind === "create") {
        return {
          pageId: change.pageId,
          expectedFingerprint: null,
          nextFingerprint: change.nextFingerprint,
        };
      }
      const expectedFingerprint = authoritativePageFingerprints.get(
        change.pageId,
      );
      if (!expectedFingerprint) {
        throw new Error(
          `Missing authoritative page ${change.pageId} for AI changeset`,
        );
      }
      return {
        pageId: change.pageId,
        expectedFingerprint,
        ...(change.kind === "delete"
          ? {}
          : { nextFingerprint: change.nextFingerprint }),
      };
    }),
  );

  return {
    siteId: input.snapshot.site.siteId,
    summary: input.summary.slice(0, 20_000),
    expectedDraftRevision: input.snapshot.site.draftRevision,
    expectedContentHashes,
    // The workspace package deliberately canonicalizes its materialized
    // baseline (for example by requiring stable node IDs). Concurrency guards
    // must instead fingerprint the exact authoritative export that Convex will
    // compare inside the transaction.
    expectedProjectFingerprint: input.snapshot.trust.projectFingerprint,
    expectedSiteFingerprint: input.snapshot.trust.siteFingerprint,
    nextSiteFingerprint: input.changeset.nextSiteFingerprint,
    nextSiteName: input.changeset.nextProject.title,
    nextPageOrder: input.changeset.nextProject.pages.map((page) => page.id),
    pageFingerprints,
    operations,
    defaultPageRef:
      typeof defaultPageValue === "string" ? defaultPageValue : undefined,
    requestId: input.requestId,
  };
}
