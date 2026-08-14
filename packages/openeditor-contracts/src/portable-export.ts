import type { OpenEditorDocument, ProseMirrorNode } from "@openeditor/core";

type PageTab = {
  id: string;
  label: string;
  document: OpenEditorDocument;
};

const readPageTabs = (
  document: OpenEditorDocument,
): readonly PageTab[] | null => {
  if (document.content.length !== 1) return null;
  const node = document.content[0];
  if (node?.type !== "baseblocksPageTabs") return null;
  const tabs = (node.attrs?.tabs as { tabs?: readonly PageTab[] } | undefined)
    ?.tabs;
  return Array.isArray(tabs) && tabs.length > 0 ? tabs : null;
};

/**
 * Converts the BaseBlocks page-level tab structure to ordinary OpenEditor
 * blocks for HTML, text, Markdown, and DOCX export.
 */
export function projectBaseBlocksDocumentForPortableExport(
  document: OpenEditorDocument,
): OpenEditorDocument {
  const tabs = readPageTabs(document);
  if (!tabs) return document;
  const content = tabs.flatMap<ProseMirrorNode>((tab) => [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: tab.label }],
    },
    ...tab.document.content,
  ]);
  return { ...document, content };
}
