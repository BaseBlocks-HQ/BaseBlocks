import { baseBlocksBlockRegistry } from "@baseblocks/openeditor-contracts/block-registry";
import {
  parseOpenEditorDocument,
  type OpenEditorNode,
} from "../pageContentFormat";

export type ReleaseFieldDiff = {
  label: string;
  before?: string;
  after?: string;
};

export type ReleaseDetailedChange = {
  entityType: "site" | "page" | "library" | "folder" | "file";
  entityId: string;
  changeType: "added" | "updated" | "deleted" | "moved";
  label: string;
  fields: ReleaseFieldDiff[];
  content?: {
    beforeLines: string[];
    afterLines: string[];
  };
};

function inlineText(node: OpenEditorNode): string {
  if (typeof node.text === "string") return node.text;
  return (node.content ?? []).map(inlineText).join("");
}

function readableNodeText(node: OpenEditorNode): string {
  const text = inlineText(node).trim();
  if (text) return text;
  if (node.type === "customBlock") {
    const resolved = baseBlocksBlockRegistry.resolve(node);
    return resolved.status === "ready"
      ? baseBlocksBlockRegistry.toText(node).trim()
      : "";
  }
  const attrs = node.attrs ?? {};
  return ["name", "title", "label", "description", "alt", "code"]
    .map((key) => attrs[key])
    .filter((value): value is string => typeof value === "string" && !!value)
    .join(" · ");
}

function nodeLines(node: OpenEditorNode, depth = 0): string[] {
  const text = readableNodeText(node);
  const indent = "  ".repeat(depth);

  if (node.type === "text") return [];
  if (node.type === "paragraph") {
    return text ? [`${indent}${text}`] : [];
  }
  if (node.type === "heading") {
    return text ? [`${indent}${text}`] : [];
  }
  if (node.type === "bulletList" || node.type === "orderedList") {
    return (node.content ?? []).flatMap((child, index) => {
      const childText = inlineText(child).trim();
      const marker = node.type === "orderedList" ? `${index + 1}.` : "•";
      return [`${indent}${marker} ${childText}`];
    });
  }
  if (node.type === "blockquote") return text ? [`${indent}${text}`] : [];
  if (node.type === "codeBlock") return text.split("\n");

  const title = node.type
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (value) => value.toUpperCase());
  if (text) return [`${indent}${title}: ${text}`];
  const children = (node.content ?? []).flatMap((child) =>
    nodeLines(child, depth + 1),
  );
  return children;
}

export function openEditorContentLines(serialized?: string): string[] {
  if (!serialized) return [];
  const document = parseOpenEditorDocument(serialized);
  return document.content.flatMap((node) => nodeLines(node));
}

export function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "On" : "Off";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return JSON.stringify(value);
}

export function changedField(
  label: string,
  before: unknown,
  after: unknown,
): ReleaseFieldDiff | null {
  if (JSON.stringify(before) === JSON.stringify(after)) return null;
  return {
    label,
    before: formatValue(before),
    after: formatValue(after),
  };
}
