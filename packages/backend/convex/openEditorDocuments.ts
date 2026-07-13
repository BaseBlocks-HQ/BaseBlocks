export type OpenEditorNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: OpenEditorNode[];
  text?: string;
};

export type OpenEditorDocument = {
  type: "doc";
  version: 1;
  content: OpenEditorNode[];
  meta?: Record<string, unknown>;
};

export const emptyOpenEditorDocument = (): OpenEditorDocument => ({
  type: "doc",
  version: 1,
  content: [{ type: "paragraph" }],
});

export function parseOpenEditorDocument(value: unknown): OpenEditorDocument {
  const document =
    typeof value === "string" ? (JSON.parse(value) as unknown) : value;
  if (
    !document ||
    typeof document !== "object" ||
    (document as { type?: unknown }).type !== "doc" ||
    (document as { version?: unknown }).version !== 1 ||
    !Array.isArray((document as { content?: unknown }).content)
  ) {
    throw new Error("Invalid OpenEditor document");
  }
  return document as OpenEditorDocument;
}

export function visitOpenEditorNodes(
  value: unknown,
  visit: (node: OpenEditorNode) => void,
): void {
  if (Array.isArray(value)) {
    for (const item of value) visitOpenEditorNodes(item, visit);
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (typeof record.type === "string" && record.type !== "doc") {
    visit(record as OpenEditorNode);
  }
  for (const child of Object.values(record)) {
    if (child && typeof child === "object") visitOpenEditorNodes(child, visit);
  }
}

export function collectOpenEditorAttributeValues(
  document: OpenEditorDocument,
  nodeType: string,
  attributePath: string[],
): Set<string> {
  const values = new Set<string>();
  visitOpenEditorNodes(document, (node) => {
    if (node.type !== nodeType) return;
    let value: unknown = node.attrs;
    for (const key of attributePath) {
      if (!value || typeof value !== "object") return;
      value = (value as Record<string, unknown>)[key];
    }
    if (typeof value === "string" && value) values.add(value);
  });
  return values;
}

export function extractOpenEditorText(document: OpenEditorDocument): string {
  const parts: string[] = [];
  visitOpenEditorNodes(document, (node) => {
    if (typeof node.text === "string") parts.push(node.text);
    const attrs = node.attrs;
    if (!attrs) return;
    for (const key of ["name", "title", "label", "description", "code"]) {
      if (typeof attrs[key] === "string") parts.push(attrs[key] as string);
    }
    const collectStrings = (value: unknown, key?: string): void => {
      if (typeof value === "string") {
        if (
          key &&
          key !== "id" &&
          !key.endsWith("Id") &&
          !["url", "src", "href"].includes(key)
        ) {
          parts.push(value);
        }
        return;
      }
      if (Array.isArray(value)) {
        for (const item of value) collectStrings(item);
        return;
      }
      if (!value || typeof value !== "object") return;
      for (const [childKey, child] of Object.entries(value)) {
        collectStrings(child, childKey);
      }
    };
    for (const [key, value] of Object.entries(attrs)) {
      if (!["name", "title", "label", "description", "code"].includes(key)) {
        collectStrings(value, key);
      }
    }
  });
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
