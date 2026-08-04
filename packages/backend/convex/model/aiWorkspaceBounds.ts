import { getConvexSize } from "convex/values";
import { SLUG_PATTERN } from "@baseblocks/domain";
import {
  AiChangesetValidationError,
  MAX_AI_CHANGESET_CONTENT_BYTES,
  MAX_AI_FINGERPRINT_LENGTH,
  MAX_AI_PAGE_ICON_LENGTH,
  MAX_AI_PAGE_REFERENCE_LENGTH,
  MAX_AI_PAGE_SLUG_LENGTH,
  MAX_AI_PAGE_TITLE_LENGTH,
} from "./aiChangesetPlan";

export const MAX_AI_REFERENCE_LIBRARIES = 500;
export const MAX_AI_REFERENCE_FILES = 2_000;
export const MAX_AI_WORKSPACE_METADATA_BYTES = 2_000_000;
export const MAX_AI_WORKSPACE_CONTENT_BYTES = 32_000_000;
export const MAX_AI_SITE_NAME_LENGTH = 200;
const MAX_AI_PAGE_CONTENT_BYTES = 900_000;
const pageSlugPattern = new RegExp(`^${SLUG_PATTERN}$`);

function fail(message: string): never {
  throw new AiChangesetValidationError(message);
}

export function aiSiteNameChanged(
  currentSiteName: string,
  nextSiteName: string,
): boolean {
  return currentSiteName !== nextSiteName;
}

export function assertBoundedFingerprintInput(input: {
  nextSiteName: string;
  expectedProjectFingerprint: string;
  expectedSiteFingerprint: string;
  nextSiteFingerprint: string;
  pageFingerprints: Array<{
    pageId: string;
    expectedFingerprint: string | null;
    nextFingerprint?: string;
  }>;
  nextPageOrder: string[];
  operations: Array<{ kind: "create" | "update" | "delete"; ref: string }>;
}): void {
  if (
    !input.nextSiteName.trim() ||
    input.nextSiteName !== input.nextSiteName.trim() ||
    input.nextSiteName.length > MAX_AI_SITE_NAME_LENGTH
  ) {
    fail(
      `OpenEditor next site name must be trimmed and contain 1-${MAX_AI_SITE_NAME_LENGTH} characters`,
    );
  }
  for (const [name, value] of [
    ["project", input.expectedProjectFingerprint],
    ["site", input.expectedSiteFingerprint],
    ["next site", input.nextSiteFingerprint],
  ] as const) {
    if (!value || value.length > MAX_AI_FINGERPRINT_LENGTH) {
      fail(`OpenEditor ${name} fingerprint is invalid`);
    }
  }
  if (input.nextPageOrder.length > 500) {
    fail("OpenEditor next-page order exceeds the site page capacity");
  }
  const nextPageIds = new Set<string>();
  for (const pageId of input.nextPageOrder) {
    if (!pageId || pageId.length > MAX_AI_PAGE_REFERENCE_LENGTH) {
      fail("OpenEditor next-page order contains an invalid reference");
    }
    if (nextPageIds.has(pageId)) {
      fail(`Duplicate OpenEditor next-page reference ${pageId}`);
    }
    nextPageIds.add(pageId);
  }
  if (input.pageFingerprints.length !== input.operations.length) {
    fail("Every page operation must carry one OpenEditor fingerprint");
  }
  const seen = new Set<string>();
  const operations = new Map(
    input.operations.map((operation) => [operation.ref, operation.kind]),
  );
  for (const value of input.pageFingerprints) {
    if (!value.pageId || value.pageId.length > MAX_AI_PAGE_REFERENCE_LENGTH) {
      fail("OpenEditor page fingerprint reference is invalid");
    }
    const operationKind = operations.get(value.pageId);
    if (!operationKind) {
      fail(`OpenEditor fingerprint has no operation for ${value.pageId}`);
    }
    if ((operationKind === "create") !== (value.expectedFingerprint === null)) {
      fail(`OpenEditor expected fingerprint kind mismatch for ${value.pageId}`);
    }
    if (
      (operationKind === "delete") !==
      (value.nextFingerprint === undefined)
    ) {
      fail(`OpenEditor next fingerprint kind mismatch for ${value.pageId}`);
    }
    if (seen.has(value.pageId)) {
      fail(`Duplicate OpenEditor page fingerprint for ${value.pageId}`);
    }
    seen.add(value.pageId);
    for (const fingerprint of [
      value.expectedFingerprint,
      value.nextFingerprint,
    ]) {
      if (
        fingerprint !== null &&
        fingerprint !== undefined &&
        (!fingerprint || fingerprint.length > MAX_AI_FINGERPRINT_LENGTH)
      ) {
        fail(`OpenEditor page fingerprint for ${value.pageId} is invalid`);
      }
    }
  }
}

export function assertWorkspaceReferenceCounts(input: {
  libraryCount: number;
  fileCount: number;
}): void {
  if (input.libraryCount > MAX_AI_REFERENCE_LIBRARIES) {
    fail(
      `Site exceeds the ${MAX_AI_REFERENCE_LIBRARIES} library AI workspace limit`,
    );
  }
  if (input.fileCount > MAX_AI_REFERENCE_FILES) {
    fail(`Site exceeds the ${MAX_AI_REFERENCE_FILES} file AI workspace limit`);
  }
}

export function assertWorkspaceMetadataSize(value: unknown): void {
  const size = getConvexSize(JSON.stringify(value));
  if (size > MAX_AI_WORKSPACE_METADATA_BYTES) {
    fail(
      `AI workspace metadata exceeds the ${MAX_AI_WORKSPACE_METADATA_BYTES} byte limit`,
    );
  }
}

/**
 * Bound aggregate active draft content before any blob bodies are loaded.
 * `contentSize` is maintained alongside each authoritative page document.
 */
export function assertWorkspaceDocumentContentSize(
  documents: Array<{ contentSize: number } | null>,
): void {
  let total = 0;
  for (const document of documents) {
    if (!document) continue;
    if (
      !Number.isSafeInteger(document.contentSize) ||
      document.contentSize < 0
    ) {
      fail("AI workspace contains an invalid persisted content size");
    }
    total += document.contentSize;
    if (total > MAX_AI_WORKSPACE_CONTENT_BYTES) {
      fail(
        `AI workspace content exceeds the ${MAX_AI_WORKSPACE_CONTENT_BYTES} byte limit`,
      );
    }
  }
}

export function assertWorkspacePageFields(
  pages: Array<{
    pageId: string;
    parentId?: string;
    title: string;
    slug: string;
    icon?: string;
    order: number;
  }>,
): void {
  for (const page of pages) {
    if (!page.pageId || page.pageId.length > MAX_AI_PAGE_REFERENCE_LENGTH) {
      fail("AI workspace contains an invalid page ID");
    }
    if ((page.parentId?.length ?? 0) > MAX_AI_PAGE_REFERENCE_LENGTH) {
      fail(`Page ${page.pageId} has an invalid parent reference`);
    }
    if (!page.title.trim() || page.title.length > MAX_AI_PAGE_TITLE_LENGTH) {
      fail(`Page ${page.pageId} has an invalid title`);
    }
    if (
      !page.slug.trim() ||
      page.slug.length > MAX_AI_PAGE_SLUG_LENGTH ||
      !pageSlugPattern.test(page.slug)
    ) {
      fail(`Page ${page.pageId} has an invalid slug`);
    }
    if ((page.icon?.length ?? 0) > MAX_AI_PAGE_ICON_LENGTH) {
      fail(`Page ${page.pageId} has an invalid icon`);
    }
    if (!Number.isSafeInteger(page.order) || page.order < 0) {
      fail(`Page ${page.pageId} has an invalid order`);
    }
  }
}

export function assertAiOperationEnvelope(
  operations: Array<{
    kind: "create" | "update" | "delete";
    clientId?: string;
    pageId?: string;
    parentRef?: string | null;
    title?: string;
    slug?: string;
    icon?: string | null;
    order?: number;
    content?: unknown;
  }>,
): void {
  let contentBytes = 0;
  for (const operation of operations) {
    const ref =
      operation.kind === "create" ? operation.clientId : operation.pageId;
    if (!ref || ref.length > MAX_AI_PAGE_REFERENCE_LENGTH) {
      fail("AI changeset contains an invalid page reference");
    }
    if ((operation.parentRef?.length ?? 0) > MAX_AI_PAGE_REFERENCE_LENGTH) {
      fail(`Page ${ref} has an invalid parent reference`);
    }
    if ((operation.title?.length ?? 0) > MAX_AI_PAGE_TITLE_LENGTH) {
      fail(`Page ${ref} title is too long`);
    }
    if (operation.title !== undefined && !operation.title.trim()) {
      fail(`Page ${ref} title cannot be empty`);
    }
    if ((operation.slug?.length ?? 0) > MAX_AI_PAGE_SLUG_LENGTH) {
      fail(`Page ${ref} slug is too long`);
    }
    if (
      operation.slug !== undefined &&
      (!operation.slug.trim() ||
        !pageSlugPattern.test(operation.slug.trim().toLowerCase()))
    ) {
      fail(`Page ${ref} slug is invalid`);
    }
    if ((operation.icon?.length ?? 0) > MAX_AI_PAGE_ICON_LENGTH) {
      fail(`Page ${ref} icon is too long`);
    }
    if (
      operation.order !== undefined &&
      (!Number.isSafeInteger(operation.order) || operation.order < 0)
    ) {
      fail(`Page ${ref} has an invalid order`);
    }
    if (operation.content !== undefined) {
      const bytes = getConvexSize(JSON.stringify(operation.content));
      if (bytes > MAX_AI_PAGE_CONTENT_BYTES) {
        fail(`Page ${ref} exceeds the 900 KB content limit`);
      }
      contentBytes += bytes;
    }
  }
  if (contentBytes > MAX_AI_CHANGESET_CONTENT_BYTES) {
    fail(
      `Changeset exceeds the ${MAX_AI_CHANGESET_CONTENT_BYTES} byte edited-content limit`,
    );
  }
}
