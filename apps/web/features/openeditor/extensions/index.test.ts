import { describe, expect, test } from "bun:test";
import type { OpenEditorReactExtension } from "@openeditor/react";
import { decisionTreeExtension } from "./decision-tree";
import { directoryExtension } from "./directory";
import { libraryExtension } from "./library";
import { quickLinksExtension } from "./quick-links";
import { searchExtension } from "./search";

describe("block menu configuration", () => {
  const configuration = (extension: OpenEditorReactExtension) =>
    extension.blockMenu?.configure;

  test.each([
    ["directory", directoryExtension],
    ["library", libraryExtension],
    ["search", searchExtension],
  ])("adds Configure to the %s block", (_name, extension) => {
    expect(configuration(extension)).toBeDefined();
  });

  test.each([
    ["decision tree", decisionTreeExtension],
    ["quick links", quickLinksExtension],
  ])("does not add Configure to the %s block", (_name, extension) => {
    expect(configuration(extension)).toBeUndefined();
  });
});
