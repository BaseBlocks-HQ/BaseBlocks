import { decisionTreeExtension } from "./decision-tree";
import { directoryExtension } from "./directory";
import { libraryExtension } from "./library";
import { quickLinksExtension } from "./quick-links";
import { searchExtension } from "./search";

export const openEditorExtensions = [
  quickLinksExtension,
  directoryExtension,
  searchExtension,
  libraryExtension,
  decisionTreeExtension,
] as const;
