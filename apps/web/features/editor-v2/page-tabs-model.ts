import type { OpenEditorBlock, OpenEditorDocument } from "@openeditor/core";

export type OpenEditorPageTab = {
  id: string;
  label: string;
  document: OpenEditorDocument;
};

export type OpenEditorPageTabs = {
  tabs: OpenEditorPageTab[];
};

export function readOpenEditorPageTabs(
  document: OpenEditorDocument,
): OpenEditorPageTabs | null {
  const node = document.content[0];
  if (node?.type !== "baseblocksPageTabs") return null;
  const value = node.attrs?.tabs;
  if (!value || typeof value !== "object") return null;
  const candidate = value as { tabs?: unknown };
  if (!Array.isArray(candidate.tabs) || candidate.tabs.length === 0)
    return null;

  const tabs = candidate.tabs.flatMap((item): OpenEditorPageTab[] => {
    if (!item || typeof item !== "object") return [];
    const tab = item as Partial<OpenEditorPageTab>;
    if (
      typeof tab.id !== "string" ||
      typeof tab.label !== "string" ||
      !tab.document ||
      tab.document.type !== "doc" ||
      tab.document.version !== 1 ||
      !Array.isArray(tab.document.content)
    )
      return [];
    return [{ id: tab.id, label: tab.label, document: tab.document }];
  });
  return tabs.length > 0 ? { tabs } : null;
}

export function updateOpenEditorPageTabs(
  document: OpenEditorDocument,
  tabs: OpenEditorPageTabs,
): OpenEditorDocument {
  const node: OpenEditorBlock = {
    type: "baseblocksPageTabs",
    attrs: { tabs },
  };
  return {
    ...document,
    content: [node, ...document.content.slice(1)],
  };
}

export function shouldRefreshLegacyTabbedDocument(
  legacyTabCount: number,
  document: OpenEditorDocument | undefined,
) {
  if (legacyTabCount === 0 || !document) return false;
  if (readOpenEditorPageTabs(document)) return false;
  return (
    document.meta?.source === "baseblocks-legacy-converter" &&
    (document.meta.schemaVersion ?? 0) < 2
  );
}
