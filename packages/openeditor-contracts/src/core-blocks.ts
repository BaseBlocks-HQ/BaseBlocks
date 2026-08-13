import { defineOpenEditorCustomBlock } from "@openeditor/custom-block";
import type { JsonObject, OpenEditorDocument } from "@openeditor/core";

import {
  libraryManifest,
  pageTabsManifest,
  searchManifest,
} from "./core-manifests";
export {
  baseBlocksCoreBlockManifests,
  libraryManifest,
  pageTabsManifest,
  searchManifest,
} from "./core-manifests";

export const searchBlock = defineOpenEditorCustomBlock<
  JsonObject & {
    placeholder: string;
    maxResults: number;
    showFileType: boolean;
  }
>({
  ...searchManifest,
  initialData: () => ({
    placeholder: "Search documents…",
    maxResults: 10,
    showFileType: true,
  }),
  toHtml: ({ data }) => ({
    tag: "div",
    attrs: { "aria-label": data.placeholder },
    children: ["Site search"],
  }),
  toText: () => "[Site search]",
});

export const libraryBlock = defineOpenEditorCustomBlock<
  JsonObject & { libraryId?: string; allowDownloads: boolean }
>({
  ...libraryManifest,
  initialData: () => ({ allowDownloads: true }),
  toHtml: () => ({ tag: "div", children: ["Document library"] }),
  toText: () => "[Document library]",
});

export type PageTabsData = {
  tabs: Array<{ id: string; label: string; document: OpenEditorDocument }>;
};
export const pageTabsBlock = defineOpenEditorCustomBlock<PageTabsData>({
  ...pageTabsManifest,
  initialData: () => ({
    tabs: [
      {
        id: "default",
        label: "Tab 1",
        document: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              attrs: { "openeditor-id": "page-tabs-default-paragraph" },
            },
          ],
        },
      },
    ],
  }),
  toHtml: ({ data, renderDocument }) => ({
    tag: "div",
    children: data.tabs.map((tab) => ({
      tag: "section",
      children: [
        { tag: "strong", children: [tab.label] },
        renderDocument(tab.document),
      ],
    })),
  }),
  toText: ({ data, documentToText }) =>
    data.tabs
      .map((tab) => `${tab.label}\n${documentToText(tab.document)}`)
      .join("\n"),
});

export const baseBlocksCoreBlocks = [
  searchBlock,
  libraryBlock,
  pageTabsBlock,
] as const;
