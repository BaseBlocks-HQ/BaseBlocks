import type { OpenEditorCustomBlockManifest } from "@openeditor/custom-block";

const id = { type: "string", minLength: 1, maxLength: 200 } as const;
const text = (maxLength: number) => ({ type: "string", maxLength }) as const;

export const directoryManifest = {
  id: "baseblocks.directory",
  label: "Directory",
  version: 1,
  dataSchema: {
    type: "object",
    properties: {
      directories: {
        type: "array",
        minItems: 1,
        maxItems: 50,
        items: {
          type: "object",
          properties: {
            id,
            label: text(500),
            columnIds: { type: "array", items: id, minItems: 1, maxItems: 100 },
            rows: {
              type: "array",
              maxItems: 10_000,
              items: {
                type: "object",
                properties: {
                  id,
                  cells: { type: "object", additionalProperties: text(20_000) },
                },
                required: ["id", "cells"],
                additionalProperties: false,
              },
            },
            pageSize: {
              type: "number",
              nullable: true,
              integer: true,
              minimum: 1,
              maximum: 10_000,
            },
          },
          required: ["id", "label", "columnIds", "rows", "pageSize"],
          additionalProperties: false,
        },
      },
    },
    required: ["directories"],
    additionalProperties: false,
  },
  constraints: [
    { kind: "uniqueBy", array: "directories", keys: ["id"] },
    { kind: "unique", array: "directories.*.columnIds" },
    { kind: "uniqueBy", array: "directories.*.rows", keys: ["id"] },
    {
      kind: "keysIn",
      scope: "directories.*",
      objects: "rows.*.cells",
      keys: "columnIds",
      requireAll: true,
    },
  ],
} as const satisfies OpenEditorCustomBlockManifest;

export const decisionTreeManifest = {
  id: "baseblocks.decision-tree",
  label: "Decision Tree",
  version: 1,
  dataSchema: {
    type: "object",
    properties: {
      tabsMode: { type: "string", enum: ["row", "dropdown"] },
      trees: {
        type: "array",
        minItems: 1,
        maxItems: 50,
        items: {
          type: "object",
          properties: {
            id,
            label: text(500),
            nodes: {
              type: "array",
              maxItems: 5_000,
              items: {
                type: "object",
                properties: {
                  id,
                  parentId: { ...id, nullable: true },
                  name: text(500),
                  order: { type: "number", integer: true, minimum: 0 },
                  document: { type: "document" },
                },
                required: ["id", "parentId", "name", "order", "document"],
                additionalProperties: false,
              },
            },
          },
          required: ["id", "label", "nodes"],
          additionalProperties: false,
        },
      },
    },
    required: ["trees", "tabsMode"],
    additionalProperties: false,
  },
  constraints: [
    { kind: "uniqueBy", array: "trees", keys: ["id"] },
    {
      kind: "graph",
      array: "trees.*.nodes",
      id: "id",
      parent: "parentId",
      siblingKeys: ["order"],
    },
  ],
} as const satisfies OpenEditorCustomBlockManifest;

export const quickLinksManifest = {
  id: "baseblocks.quick-links",
  label: "Quick Links",
  version: 1,
  dataSchema: {
    type: "object",
    properties: {
      links: {
        type: "array",
        maxItems: 200,
        items: {
          type: "object",
          properties: {
            id,
            title: text(500),
            url: text(4_096),
            artwork: {
              type: "oneOf",
              variants: [
                {
                  type: "object",
                  properties: { kind: { type: "string", enum: ["icon"] }, id },
                  required: ["kind", "id"],
                  additionalProperties: false,
                },
                {
                  type: "object",
                  properties: {
                    kind: { type: "string", enum: ["asset"] },
                    assetId: {
                      type: "string",
                      format: "asset-id",
                      minLength: 1,
                      maxLength: 128,
                    },
                  },
                  required: ["kind", "assetId"],
                  additionalProperties: false,
                },
              ],
            },
            linkType: { type: "string", enum: ["website", "app"] },
          },
          required: ["id", "title", "url", "linkType"],
          additionalProperties: false,
        },
      },
    },
    required: ["links"],
    additionalProperties: false,
  },
  constraints: [
    { kind: "uniqueBy", array: "links", keys: ["id"] },
    {
      kind: "url",
      path: "links.*.url",
      when: { field: "linkType", equals: "website" },
      allowRelative: true,
      schemes: ["http", "https"],
    },
    {
      kind: "url",
      path: "links.*.url",
      when: { field: "linkType", equals: "app" },
      requireSchemeSeparator: true,
      denySchemes: ["javascript", "data", "vbscript"],
    },
  ],
} as const satisfies OpenEditorCustomBlockManifest;

export const baseBlocksCustomBlockManifests = [
  directoryManifest,
  decisionTreeManifest,
  quickLinksManifest,
] as const satisfies readonly OpenEditorCustomBlockManifest[];
