import { decisionTreeExtension } from "./decision-tree";
import { directoryExtension } from "./directory";
import { libraryExtension } from "./library";
import { migrationPlaceholderExtension } from "./migration-placeholder";
import { quickLinksExtension } from "./quick-links";
import { searchExtension } from "./search";

export const editorV2Extensions = [
  migrationPlaceholderExtension,
  quickLinksExtension,
  directoryExtension,
  searchExtension,
  libraryExtension,
  decisionTreeExtension,
] as const;
