"use client";

export { directoryEditor } from "./directory-editor";
export { decisionTreeEditor } from "./decision-tree-editor";
export { quickLinksEditor } from "./quick-links-editor";

import { decisionTreeEditor } from "./decision-tree-editor";
import { directoryEditor } from "./directory-editor";
import { quickLinksEditor } from "./quick-links-editor";

export const baseBlocksCustomBlockEditors = [
  directoryEditor,
  decisionTreeEditor,
  quickLinksEditor,
] as const;
