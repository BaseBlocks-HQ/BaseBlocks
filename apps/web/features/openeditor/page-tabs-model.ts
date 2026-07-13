import type { OpenEditorBlock, OpenEditorDocument } from "@openeditor/core";

type OpenEditorTextRange = {
  from: number;
  to: number;
};

export type OpenEditorPageTab = {
  id: string;
  label: string;
  document: OpenEditorDocument;
};

type OpenEditorPageTabs = {
  tabs: OpenEditorPageTab[];
};

export function deleteOpenEditorTextRange(
  document: OpenEditorDocument,
  range: OpenEditorTextRange,
): OpenEditorDocument {
  if (range.from >= range.to) return document;

  const deleteFromNode = (
    node: OpenEditorBlock,
    contentStart: number,
  ): OpenEditorBlock => {
    if (!node.content) return node;

    let offset = contentStart;
    const content = node.content.flatMap((child): OpenEditorBlock[] => {
      if (child.type === "text") {
        const text = child.text ?? "";
        const childEnd = offset + text.length;
        const deleteFrom = Math.max(0, range.from - offset);
        const deleteTo = Math.min(text.length, range.to - offset);
        offset = childEnd;

        if (deleteFrom >= deleteTo) return [child];
        const nextText = text.slice(0, deleteFrom) + text.slice(deleteTo);
        return nextText ? [{ ...child, text: nextText }] : [];
      }

      const childContentStart = offset + 1;
      const nextChild = deleteFromNode(child, childContentStart);
      offset += getOpenEditorNodeSize(child);
      return [nextChild];
    });

    return { ...node, content };
  };

  return {
    ...document,
    content: document.content.map((node, index, content) => {
      const contentStart = content
        .slice(0, index)
        .reduce(
          (position, sibling) => position + getOpenEditorNodeSize(sibling),
          1,
        );
      return deleteFromNode(node, contentStart);
    }),
  };
}

function getOpenEditorNodeSize(node: OpenEditorBlock): number {
  if (node.type === "text") return node.text?.length ?? 0;
  return (
    2 +
    (node.content ?? []).reduce(
      (size, child) => size + getOpenEditorNodeSize(child),
      0,
    )
  );
}

export function createOpenEditorPageTabs(
  document: OpenEditorDocument,
  tabId: string,
): OpenEditorDocument {
  return updateOpenEditorPageTabs(
    { ...document, content: [] },
    {
      tabs: [
        {
          id: tabId,
          label: "Tab 1",
          document,
        },
      ],
    },
  );
}

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
