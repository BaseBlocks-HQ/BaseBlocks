import type { OpenEditorCustomBlockManifest } from "@openeditor/custom-block";

const text = (maxLength: number) => ({ type: "string", maxLength }) as const;
const id = { type: "string", minLength: 1, maxLength: 200 } as const;

export const searchManifest = {
  id: "baseblocks.search",
  label: "Search",
  version: 1,
  dataSchema: {
    type: "object",
    properties: {
      placeholder: text(500),
      maxResults: { type: "number", integer: true, minimum: 1, maximum: 50 },
      showFileType: { type: "boolean" },
    },
    required: ["placeholder", "maxResults", "showFileType"],
    additionalProperties: false,
  },
} as const satisfies OpenEditorCustomBlockManifest;

export const libraryManifest = {
  id: "baseblocks.library",
  label: "Library",
  version: 1,
  dataSchema: {
    type: "object",
    properties: { libraryId: id, allowDownloads: { type: "boolean" } },
    required: ["allowDownloads"],
    additionalProperties: false,
  },
} as const satisfies OpenEditorCustomBlockManifest;

export const pageTabsManifest = {
  id: "baseblocks.page-tabs",
  label: "Page Tabs",
  version: 1,
  dataSchema: {
    type: "object",
    properties: {
      tabs: {
        type: "array",
        minItems: 1,
        maxItems: 50,
        items: {
          type: "object",
          properties: { id, label: text(500), document: { type: "document" } },
          required: ["id", "label", "document"],
          additionalProperties: false,
        },
      },
    },
    required: ["tabs"],
    additionalProperties: false,
  },
  constraints: [{ kind: "uniqueBy", array: "tabs", keys: ["id"] }],
} as const satisfies OpenEditorCustomBlockManifest;

export const baseBlocksCoreBlockManifests = [
  searchManifest,
  libraryManifest,
  pageTabsManifest,
] as const satisfies readonly OpenEditorCustomBlockManifest[];
