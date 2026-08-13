type JsonRecord = Record<string, unknown>;

const legacyBlocks = {
  baseblocksSearch: ["baseblocks.search", "search"],
  baseblocksLibrary: ["baseblocks.library", "library"],
  baseblocksPageTabs: ["baseblocks.page-tabs", "tabs"],
  baseblocksDirectory: ["baseblocks.directory", "directory"],
  baseblocksDecisionTree: ["baseblocks.decision-tree", "decisionTree"],
  baseblocksQuickLinks: ["baseblocks.quick-links", "links"],
} as const;

type LegacyNodeType = keyof typeof legacyBlocks;

function record(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Legacy custom block data is not an object");
  return value as JsonRecord;
}

function migrateDocument(value: unknown): [unknown, boolean] {
  const document = record(value);
  if (!Array.isArray(document.content)) return [value, false];
  let changed = false;
  const content = document.content.map((node) => {
    const [migrated, nodeChanged] = migrateNode(node);
    changed ||= nodeChanged;
    return migrated;
  });
  return changed ? [{ ...document, content }, true] : [value, false];
}

function migrateNestedDocuments(blockId: string, data: unknown): unknown {
  const value = record(data);
  if (blockId === "baseblocks.page-tabs") {
    if (!Array.isArray(value.tabs))
      throw new Error("Legacy Page Tabs data has no tabs");
    return {
      ...value,
      tabs: value.tabs.map((tab) => {
        const item = record(tab);
        return { ...item, document: migrateDocument(item.document)[0] };
      }),
    };
  }
  if (blockId === "baseblocks.decision-tree") {
    if (!Array.isArray(value.trees))
      throw new Error("Legacy Decision Tree data has no trees");
    return {
      ...value,
      trees: value.trees.map((tree) => {
        const item = record(tree);
        if (!Array.isArray(item.nodes))
          throw new Error("Legacy Decision Tree has invalid nodes");
        return {
          ...item,
          nodes: item.nodes.map((node) => {
            const question = record(node);
            return {
              ...question,
              document: migrateDocument(question.document)[0],
            };
          }),
        };
      }),
    };
  }
  return data;
}

function migrateQuickLinks(value: unknown): unknown {
  if (!Array.isArray(value))
    throw new Error("Legacy Quick Links data is not an array");
  return {
    links: value.map((item) => {
      const { imageUrl, ...link } = record(item);
      const next = {
        ...link,
        linkType: link.linkType === "app" ? "app" : "website",
      };
      if (typeof imageUrl !== "string" || !imageUrl) return next;
      const assetId = /^\/api\/files\/([^/?#]+)(?:[?#].*)?$/.exec(
        imageUrl,
      )?.[1];
      if (!assetId)
        throw new Error("Legacy Quick Links artwork is not a managed asset");
      return { ...next, artwork: { kind: "asset", assetId } };
    }),
  };
}

function migrateNode(value: unknown): [unknown, boolean] {
  const node = record(value);
  if (typeof node.type !== "string" || !(node.type in legacyBlocks)) {
    if (!Array.isArray(node.content)) return [value, false];
    let changed = false;
    const content = node.content.map((child) => {
      const [migrated, childChanged] = migrateNode(child);
      changed ||= childChanged;
      return migrated;
    });
    return changed ? [{ ...node, content }, true] : [value, false];
  }

  const [blockId, attribute] = legacyBlocks[node.type as LegacyNodeType];
  const attrs = record(node.attrs);
  const instanceId = attrs["openeditor-id"];
  if (typeof instanceId !== "string" || !instanceId)
    throw new Error(`Legacy ${node.type} node has no OpenEditor ID`);
  if (!(attribute in attrs))
    throw new Error(`Legacy ${node.type} node has no ${attribute} data`);
  const source = attrs[attribute];
  const data =
    blockId === "baseblocks.quick-links"
      ? migrateQuickLinks(source)
      : migrateNestedDocuments(blockId, source);
  return [
    {
      ...node,
      type: "customBlock",
      attrs: {
        "openeditor-id": instanceId,
        blockId,
        version: 1,
        data,
      },
    },
    true,
  ];
}

/** Convert the six old BaseBlocks nodes to OpenEditor's generic carrier. */
export function migrateBaseBlocksCustomBlockNodes<T>(document: T): T {
  return migrateDocument(document)[0] as T;
}
