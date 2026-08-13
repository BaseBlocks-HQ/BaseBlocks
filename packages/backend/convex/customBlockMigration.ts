import { getConvexSize, v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import {
  extractOpenEditorReferences,
  hashOpenEditorContent,
  parseOpenEditorDocument,
} from "./pageContentFormat";

type RecordValue = Record<string, unknown>;
const legacy = {
  baseblocksDirectory: ["baseblocks.directory", "directory"],
  baseblocksDecisionTree: ["baseblocks.decision-tree", "decisionTree"],
  baseblocksQuickLinks: ["baseblocks.quick-links", "links"],
  baseblocksSearch: ["baseblocks.search", "search"],
  baseblocksLibrary: ["baseblocks.library", "library"],
} as const;

const record = (value: unknown): RecordValue => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Migration data must be an object.");
  return value as RecordValue;
};

function migrateNode(value: unknown): [unknown, boolean] {
  const node = record(value);
  const attrs = record(node.attrs ?? {});
  if (node.type === "customBlock" && attrs.blockId === "baseblocks.page-tabs") {
    if (attrs.version !== 1)
      throw new Error("Unsupported Page Tabs carrier version.");
    const data = record(attrs.data);
    const [tabs] = migrateValue(data, true);
    return [
      {
        ...node,
        type: "baseblocksPageTabs",
        attrs: { "openeditor-id": attrs["openeditor-id"], tabs },
      },
      true,
    ];
  }
  if (typeof node.type === "string" && node.type in legacy) {
    const [blockId, field] = legacy[node.type as keyof typeof legacy];
    const source = attrs[field];
    const [nested] = migrateValue(source, true);
    const data =
      blockId === "baseblocks.quick-links" ? migrateQuickLinks(nested) : nested;
    return [
      {
        ...node,
        type: "customBlock",
        attrs: {
          "openeditor-id": attrs["openeditor-id"],
          blockId,
          version: 1,
          data,
        },
      },
      true,
    ];
  }
  if (node.type === "customBlock" || node.type === "baseblocksPageTabs")
    return migrateValue(node, true);
  return migrateValue(node, false);
}

function migrateQuickLinks(value: unknown) {
  if (!Array.isArray(value)) return value;
  return {
    links: value.map((item) => {
      const { imageUrl, ...link } = record(item);
      const next = {
        ...link,
        linkType: link.linkType === "app" ? "app" : "website",
      };
      if (typeof imageUrl !== "string" || !imageUrl) return next;
      const assetId = /^\/api\/files\/([^/?#]+)/.exec(imageUrl)?.[1];
      if (!assetId)
        throw new Error("Quick Links image is not a managed asset.");
      return { ...next, artwork: { kind: "asset", assetId } };
    }),
  };
}

function migrateValue(
  value: unknown,
  includeObjectFields: boolean,
): [unknown, boolean] {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const result =
        item &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        typeof (item as RecordValue).type === "string"
          ? migrateNode(item)
          : migrateValue(item, includeObjectFields);
      changed ||= result[1];
      return result[0];
    });
    return [changed ? next : value, changed];
  }
  if (!value || typeof value !== "object") return [value, false];
  const input = value as RecordValue;
  let changed = false;
  const entries = Object.entries(input).map(([key, item]) => {
    const result =
      key === "content" || includeObjectFields
        ? migrateValue(item, includeObjectFields)
        : ([item, false] as const);
    changed ||= result[1];
    return [key, result[0]] as const;
  });
  return [changed ? Object.fromEntries(entries) : value, changed];
}

export function migrateStoredDocument(value: unknown): unknown {
  const migrated = normalizePageTabs(migrateValue(value, false)[0]);
  return JSON.stringify(migrated) === JSON.stringify(value) ? value : migrated;
}

function normalizePageTabs(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizePageTabs);
  if (!value || typeof value !== "object") return value;
  const input = value as RecordValue;
  const normalized = Object.fromEntries(
    Object.entries(input).map(([key, child]) => [
      key,
      normalizePageTabs(child),
    ]),
  );
  if (normalized.type !== "doc" || !Array.isArray(normalized.content))
    return normalized;
  const tabsIndex = normalized.content.findIndex(
    (node) => record(node).type === "baseblocksPageTabs",
  );
  if (tabsIndex < 0 || normalized.content.length === 1) return normalized;
  const tabNode = record(normalized.content[tabsIndex]);
  const tabAttrs = record(tabNode.attrs);
  const tabsValue = record(tabAttrs.tabs);
  if (!Array.isArray(tabsValue.tabs) || tabsValue.tabs.length < 1)
    throw new Error("Page Tabs has no tabs.");
  const first = record(tabsValue.tabs[0]);
  const firstDocument = record(first.document);
  if (!Array.isArray(firstDocument.content))
    throw new Error("Page Tabs first document is invalid.");
  const outer = normalized.content.filter((_, index) => index !== tabsIndex);
  const tabs = [
    {
      ...first,
      document: {
        ...firstDocument,
        content: [...outer, ...firstDocument.content],
      },
    },
    ...tabsValue.tabs.slice(1),
  ];
  return {
    ...normalized,
    content: [
      {
        ...tabNode,
        attrs: { ...tabAttrs, tabs: { ...tabsValue, tabs } },
      },
    ],
  };
}

function migratedPayload(content: string) {
  const source = JSON.parse(content);
  const migrated = migrateStoredDocument(source);
  if (migrated === source) return null;
  const document = parseOpenEditorDocument(migrated);
  const serialized = JSON.stringify(document);
  const references = extractOpenEditorReferences(document);
  return {
    content: serialized,
    contentHash: hashOpenEditorContent(serialized),
    contentSize: getConvexSize(serialized),
    libraryIds: [...references.libraryIds],
    fileIds: [...references.fileIds],
    pageIds: [...references.pageIds],
  };
}

export const migrate = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, { cursor }) => {
    const revisions = await ctx.db.query("contentRevisions").paginate({
      cursor,
      numItems: 5,
    });
    let changed = 0;
    for (const revision of revisions.page) {
      const payload = await ctx.db.get(revision.payloadId);
      if (!payload) throw new Error(`Missing payload ${revision.payloadId}`);
      const next = migratedPayload(payload.content);
      if (!next) continue;
      await ctx.db.patch(payload._id, {
        content: next.content,
        contentHash: next.contentHash,
        contentSize: next.contentSize,
      });
      await ctx.db.patch(revision._id, {
        contentHash: next.contentHash,
        contentSize: next.contentSize,
        libraryIds: next.libraryIds.flatMap((id) => {
          const normalized = ctx.db.normalizeId("documentLibraries", id);
          return normalized ? [normalized] : [];
        }),
        fileIds: next.fileIds.flatMap((id) => {
          const normalized = ctx.db.normalizeId("files", id);
          return normalized ? [normalized] : [];
        }),
        pageIds: next.pageIds.flatMap((id) => {
          const normalized = ctx.db.normalizeId("pages", id);
          return normalized ? [normalized] : [];
        }),
      });
      const pointers = await ctx.db
        .query("pageDocuments")
        .withIndex("by_revision", (query) =>
          query.eq("revisionId", revision._id),
        )
        .collect();
      for (const pointer of pointers)
        await ctx.db.patch(pointer._id, {
          contentHash: next.contentHash,
          contentSize: next.contentSize,
        });
      const releases = await ctx.db
        .query("releasePages")
        .withIndex("by_content_revision", (query) =>
          query.eq("contentRevisionId", revision._id),
        )
        .collect();
      for (const release of releases)
        await ctx.db.patch(release._id, { contentHash: next.contentHash });
      changed += 1;
    }
    return {
      changed,
      cursor: revisions.continueCursor,
      done: revisions.isDone,
    };
  },
});

export const audit = internalQuery({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, { cursor }) => {
    const revisions = await ctx.db.query("contentRevisions").paginate({
      cursor,
      numItems: 100,
    });
    const failures: string[] = [];
    for (const revision of revisions.page) {
      const payload = await ctx.db.get(revision.payloadId);
      if (!payload) failures.push(`${revision._id}:missing-payload`);
      else {
        try {
          if (migratedPayload(payload.content))
            failures.push(`${revision._id}:legacy`);
          else parseOpenEditorDocument(payload.content);
        } catch (error) {
          failures.push(
            `${revision._id}:${error instanceof Error ? error.message : "invalid"}`,
          );
        }
      }
    }
    return {
      revisions: revisions.page.length,
      failures: failures.slice(0, 25),
      cursor: revisions.continueCursor,
      done: revisions.isDone,
    };
  },
});

export const inspectRevision = internalQuery({
  args: { revisionId: v.id("contentRevisions") },
  handler: async (ctx, { revisionId }) => {
    const revision = await ctx.db.get(revisionId);
    const payload = revision ? await ctx.db.get(revision.payloadId) : null;
    return payload?.content ?? null;
  },
});
