import { openEditorNavigationUrlPolicy } from "@openeditor/core";
import type { AiChangesetPlan, PlannedAiPage } from "./aiChangesetPlan";
import {
  extractOpenEditorReferences,
  type OpenEditorDocument,
  visitOpenEditorNodes,
} from "../pageContentFormat";

export type AiWorkspaceLibraryReference = {
  libraryId: string;
};

export type AiWorkspaceFileReference = {
  fileId: string;
  kind: "file" | "siteAsset";
  libraryId?: string;
};

function fail(message: string): never {
  throw new Error(message);
}

function pagePath(
  page: PlannedAiPage,
  pages: ReadonlyMap<string, PlannedAiPage>,
  defaultPageRef: string,
): string {
  if (page.ref === defaultPageRef) return "/";
  const segments = [page.slug];
  let parentRef = page.parentId;
  while (parentRef) {
    const parent = pages.get(parentRef);
    if (!parent) break;
    segments.unshift(parent.slug);
    parentRef = parent.parentId;
  }
  return `/${segments.join("/")}`;
}

function internalPath(href: string, sourcePath: string): string | null {
  const normalized = href.trim();
  if (!normalized) return null;
  if (normalized.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(normalized)) {
    return null;
  }
  try {
    const resolved = new URL(
      normalized,
      `https://openeditor.invalid${sourcePath}`,
    );
    return resolved.pathname.length > 1
      ? resolved.pathname.replace(/\/+$/, "")
      : "/";
  } catch {
    return null;
  }
}

function assertPublicLinkUrl(href: string, pageRef: string): void {
  if (
    href.trim().startsWith("//") ||
    openEditorNavigationUrlPolicy(href, "link") !== href.trim()
  ) {
    fail(`Page ${pageRef} contains an unsafe external link ${href}`);
  }
}

function assertInternalRoute(
  href: string,
  sourcePath: string,
  routes: ReadonlySet<string>,
  pageRef: string,
  label: string,
): void {
  const path = internalPath(href, sourcePath);
  if (!path || !routes.has(path)) {
    fail(
      `Page ${pageRef} ${label} resolves to missing site route ${path ?? href}`,
    );
  }
}

function validateDocumentLinks(input: {
  pageRef: string;
  document: OpenEditorDocument;
  sourcePath: string;
  routes: ReadonlySet<string>;
}): void {
  visitOpenEditorNodes(input.document, (node) => {
    for (const mark of node.marks ?? []) {
      if (mark.type !== "link") continue;
      const href = mark.attrs?.href;
      if (typeof href !== "string") continue;
      if (internalPath(href, input.sourcePath) !== null) {
        assertInternalRoute(
          href,
          input.sourcePath,
          input.routes,
          input.pageRef,
          "link",
        );
      } else {
        assertPublicLinkUrl(href, input.pageRef);
      }
    }

    if (node.type !== "baseblocksQuickLinks") return;
    const links = node.attrs?.links;
    if (!Array.isArray(links)) return;
    for (const value of links) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const link = value as { linkType?: unknown; url?: unknown };
      if (typeof link.url !== "string") continue;
      if (link.linkType === "app") continue;
      if (internalPath(link.url, input.sourcePath) !== null) {
        assertInternalRoute(
          link.url,
          input.sourcePath,
          input.routes,
          input.pageRef,
          "quick link",
        );
      } else if (
        openEditorNavigationUrlPolicy(link.url, "link") !== link.url.trim()
      ) {
        fail(
          `Page ${input.pageRef} contains an unsafe external quick link ${link.url}`,
        );
      }
    }
  });
}

/**
 * Validates references against the final site graph, not the exported graph.
 * This is intentionally whole-site: moving or renaming one page can invalidate
 * a relative or absolute route in a document that the agent did not edit.
 */
export function assertAiChangesetReferences(input: {
  plan: AiChangesetPlan;
  documents: ReadonlyMap<string, OpenEditorDocument>;
  libraries: readonly AiWorkspaceLibraryReference[];
  files: readonly AiWorkspaceFileReference[];
}): void {
  const pages = new Map(input.plan.pages.map((page) => [page.ref, page]));
  const paths = new Map(
    input.plan.pages.map((page) => [
      page.ref,
      pagePath(page, pages, input.plan.defaultPageRef),
    ]),
  );
  const routes = new Set(paths.values());
  if (routes.size !== input.plan.pages.length) {
    fail("The final site hierarchy contains duplicate public routes");
  }

  const libraryIds = new Set(input.libraries.map((value) => value.libraryId));
  const files = new Map(input.files.map((value) => [value.fileId, value]));
  const activePageRefs = new Set(input.plan.pages.map((value) => value.ref));
  for (const page of input.plan.pages) {
    const document = input.documents.get(page.ref);
    if (!document) fail(`Page ${page.ref} is missing its parsed document`);
    const references = extractOpenEditorReferences(document);

    visitOpenEditorNodes(document, (node) => {
      if (node.type !== "page") return;
      const pageId = node.attrs?.pageId;
      if (typeof pageId === "string" && !activePageRefs.has(pageId)) {
        fail(`Page ${page.ref} links to missing page ${pageId}`);
      }
    });

    for (const libraryId of references.libraryIds) {
      if (!libraryIds.has(libraryId)) {
        fail(`Page ${page.ref} references unavailable library ${libraryId}`);
      }
    }
    for (const attachmentId of references.attachmentIds) {
      const file = files.get(attachmentId);
      if (file?.kind !== "file") {
        fail(
          `Page ${page.ref} attachment ${attachmentId} is not an available library file`,
        );
      }
      if (file.libraryId && !libraryIds.has(file.libraryId)) {
        fail(
          `Page ${page.ref} attachment ${attachmentId} belongs to an unavailable library`,
        );
      }
    }
    for (const imageId of references.imageIds) {
      if (files.get(imageId)?.kind !== "siteAsset") {
        fail(
          `Page ${page.ref} image ${imageId} is not an available site asset`,
        );
      }
    }

    const sourcePath = paths.get(page.ref);
    if (!sourcePath) fail(`Page ${page.ref} has no final public route`);
    validateDocumentLinks({
      pageRef: page.ref,
      document,
      sourcePath,
      routes,
    });
  }
}
