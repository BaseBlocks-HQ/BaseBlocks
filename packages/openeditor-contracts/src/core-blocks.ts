import { defineOpenEditorCustomBlock } from "@openeditor/document";

export type SearchBlockData = {
  placeholder: string;
  maxResults: number;
  showFileType: boolean;
};

export function parseSearchBlockData(value: unknown): SearchBlockData {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Search data must be an object.");
  const data = value as Record<string, unknown>;
  if (typeof data.placeholder !== "string")
    throw new Error("Search placeholder must be a string.");
  if (
    !Number.isSafeInteger(data.maxResults) ||
    Number(data.maxResults) < 1 ||
    Number(data.maxResults) > 50
  )
    throw new Error("Search maximum results must be between 1 and 50.");
  if (typeof data.showFileType !== "boolean")
    throw new Error("Search file type visibility must be a boolean.");
  return {
    placeholder: data.placeholder,
    maxResults: Number(data.maxResults),
    showFileType: data.showFileType,
  };
}

export const searchBlock = defineOpenEditorCustomBlock({
  id: "baseblocks.search",
  label: "Search",
  version: 1,
  createData: () => ({
    placeholder: "Search documents…",
    maxResults: 10,
    showFileType: true,
  }),
  parseData: parseSearchBlockData,
  toHtml: ({ data }) => ({
    tag: "div",
    attrs: { "aria-label": data.placeholder },
    children: ["Site search"],
  }),
  toText: () => "[Site search]",
});

export type LibraryBlockData = {
  libraryId?: string;
  allowDownloads: boolean;
};

export function parseLibraryBlockData(value: unknown): LibraryBlockData {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Library data must be an object.");
  const data = value as Record<string, unknown>;
  if (data.libraryId !== undefined && typeof data.libraryId !== "string")
    throw new Error("Library ID must be a string.");
  if (typeof data.allowDownloads !== "boolean")
    throw new Error("Library download access must be a boolean.");
  return {
    ...(data.libraryId ? { libraryId: data.libraryId as string } : {}),
    allowDownloads: data.allowDownloads,
  };
}

export const libraryBlock = defineOpenEditorCustomBlock({
  id: "baseblocks.library",
  label: "Library",
  version: 1,
  createData: () => ({ allowDownloads: true }),
  parseData: parseLibraryBlockData,
  toHtml: () => ({ tag: "div", children: ["Document library"] }),
  toText: () => "[Document library]",
});

export const baseBlocksProductBlocks = [searchBlock, libraryBlock] as const;
