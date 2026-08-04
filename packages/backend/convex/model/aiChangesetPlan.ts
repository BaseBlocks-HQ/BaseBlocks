import { SLUG_PATTERN } from "@baseblocks/domain";

export const MAX_AI_CHANGESET_OPERATIONS = 100;
export const MAX_AI_CHANGESET_CONTENT_BYTES = 8_000_000;
export const MAX_AI_SITE_PAGES = 500;
export const MAX_AI_PAGE_TITLE_LENGTH = 200;
export const MAX_AI_PAGE_SLUG_LENGTH = 200;
export const MAX_AI_PAGE_ICON_LENGTH = 500;
export const MAX_AI_PAGE_REFERENCE_LENGTH = 200;
export const MAX_AI_FINGERPRINT_LENGTH = 300;
const pageSlugPattern = new RegExp(`^${SLUG_PATTERN}$`);

export type AiWorkspacePageSnapshot = {
  pageId: string;
  parentId?: string;
  title: string;
  slug: string;
  icon?: string;
  order: number;
  contentHash: string | null;
  document: unknown;
};

export type AiPageCreateOperation = {
  kind: "create";
  clientId: string;
  parentRef?: string | null;
  title: string;
  slug: string;
  icon?: string;
  order: number;
  content: unknown;
};

export type AiPageUpdateOperation = {
  kind: "update";
  pageId: string;
  parentRef?: string | null;
  title?: string;
  slug?: string;
  icon?: string | null;
  order?: number;
  content?: unknown;
};

export type AiPageDeleteOperation = {
  kind: "delete";
  pageId: string;
};

export type AiPageOperation =
  | AiPageCreateOperation
  | AiPageUpdateOperation
  | AiPageDeleteOperation;

export type AiContentHashPrecondition = {
  pageId: string;
  contentHash: string | null;
};

export type PlannedAiPage = AiWorkspacePageSnapshot & {
  ref: string;
  state: "existing" | "created";
  contentChanged: boolean;
  metadataChanged: boolean;
};

export type AiChangesetPlan = {
  pages: PlannedAiPage[];
  deletedPageIds: string[];
  defaultPageRef: string;
  touchedExistingPageIds: string[];
};

export class AiChangesetValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiChangesetValidationError";
  }
}

export function assertAiWorkspaceRevision(
  currentDraftRevision: number,
  expectedDraftRevision: number,
): void {
  if (currentDraftRevision !== expectedDraftRevision) {
    throw new AiChangesetValidationError(
      "The site draft changed after the AI workspace was exported",
    );
  }
}

function fail(message: string): never {
  throw new AiChangesetValidationError(message);
}

function validatePageFields(page: {
  ref: string;
  title: string;
  slug: string;
  icon?: string;
  order: number;
}) {
  if (page.ref.length > MAX_AI_PAGE_REFERENCE_LENGTH) {
    fail(
      `Page reference exceeds the ${MAX_AI_PAGE_REFERENCE_LENGTH} character limit`,
    );
  }
  if (!page.title.trim()) fail(`Page ${page.ref} must have a title`);
  if (page.title.length > MAX_AI_PAGE_TITLE_LENGTH) {
    fail(
      `Page ${page.ref} title exceeds the ${MAX_AI_PAGE_TITLE_LENGTH} character limit`,
    );
  }
  if (!page.slug.trim()) fail(`Page ${page.ref} must have a slug`);
  if (page.slug.length > MAX_AI_PAGE_SLUG_LENGTH) {
    fail(
      `Page ${page.ref} slug exceeds the ${MAX_AI_PAGE_SLUG_LENGTH} character limit`,
    );
  }
  if ((page.icon?.length ?? 0) > MAX_AI_PAGE_ICON_LENGTH) {
    fail(
      `Page ${page.ref} icon exceeds the ${MAX_AI_PAGE_ICON_LENGTH} character limit`,
    );
  }
  if (!pageSlugPattern.test(page.slug)) {
    fail(
      `Page ${page.ref} slug may only contain lowercase letters, numbers, and hyphens`,
    );
  }
  if (!Number.isSafeInteger(page.order) || page.order < 0) {
    fail(`Page ${page.ref} must have a non-negative integer order`);
  }
}

function validateTree(pages: Map<string, PlannedAiPage>) {
  for (const page of pages.values()) {
    if (page.parentId && !pages.has(page.parentId)) {
      fail(`Page ${page.ref} references missing parent ${page.parentId}`);
    }
    const seen = new Set<string>([page.ref]);
    let parentRef = page.parentId;
    while (parentRef) {
      if (seen.has(parentRef)) {
        fail(`Page hierarchy contains a cycle involving ${page.ref}`);
      }
      seen.add(parentRef);
      parentRef = pages.get(parentRef)?.parentId;
    }
  }
}

function validateSlugsAndOrders(pages: Map<string, PlannedAiPage>) {
  const slugOwners = new Map<string, string>();
  const orderOwners = new Map<string, string>();
  for (const page of pages.values()) {
    const existingSlugOwner = slugOwners.get(page.slug);
    if (existingSlugOwner) {
      fail(
        `Pages ${existingSlugOwner} and ${page.ref} use the same slug ${page.slug}`,
      );
    }
    slugOwners.set(page.slug, page.ref);

    const orderKey = `${page.parentId ?? "root"}:${page.order}`;
    const existingOrderOwner = orderOwners.get(orderKey);
    if (existingOrderOwner) {
      fail(
        `Sibling pages ${existingOrderOwner} and ${page.ref} use the same order ${page.order}`,
      );
    }
    orderOwners.set(orderKey, page.ref);
  }
}

export function planAiChangeset(input: {
  pages: AiWorkspacePageSnapshot[];
  currentDefaultPageId?: string;
  expectedContentHashes: AiContentHashPrecondition[];
  operations: AiPageOperation[];
  defaultPageRef?: string;
  allowProjectOnlyChange?: boolean;
}): AiChangesetPlan {
  if (input.pages.length > MAX_AI_SITE_PAGES) {
    fail(`Site exceeds the ${MAX_AI_SITE_PAGES} page AI workspace limit`);
  }
  if (input.operations.length === 0 && !input.allowProjectOnlyChange) {
    fail("Changeset has no operations");
  }
  if (input.operations.length > MAX_AI_CHANGESET_OPERATIONS) {
    fail(
      `Changeset contains ${input.operations.length} operations; the atomic limit is ${MAX_AI_CHANGESET_OPERATIONS}`,
    );
  }
  if (input.expectedContentHashes.length > MAX_AI_CHANGESET_OPERATIONS) {
    fail(
      `Changeset contains too many content hash preconditions; the atomic limit is ${MAX_AI_CHANGESET_OPERATIONS}`,
    );
  }

  const pages = new Map<string, PlannedAiPage>();
  for (const page of input.pages) {
    if (pages.has(page.pageId)) fail(`Duplicate page snapshot ${page.pageId}`);
    pages.set(page.pageId, {
      ...page,
      ref: page.pageId,
      state: "existing",
      contentChanged: false,
      metadataChanged: false,
    });
  }

  const operationRefs = new Set<string>();
  const touchedExistingPageIds = new Set<string>();
  const deletedPageIds: string[] = [];

  for (const operation of input.operations) {
    const operationRef =
      operation.kind === "create" ? operation.clientId : operation.pageId;
    if (!operationRef.trim()) fail("Page operation reference cannot be empty");
    if (operationRef.length > MAX_AI_PAGE_REFERENCE_LENGTH) {
      fail(
        `Page operation reference exceeds the ${MAX_AI_PAGE_REFERENCE_LENGTH} character limit`,
      );
    }
    if (operationRefs.has(operationRef)) {
      fail(`Page ${operationRef} has more than one operation`);
    }
    operationRefs.add(operationRef);

    if (operation.kind === "create") {
      if (pages.has(operation.clientId)) {
        fail(`Created page reference ${operation.clientId} already exists`);
      }
      const created: PlannedAiPage = {
        ref: operation.clientId,
        pageId: operation.clientId,
        parentId: operation.parentRef ?? undefined,
        title: operation.title.trim(),
        slug: operation.slug.trim().toLowerCase(),
        icon: operation.icon,
        order: operation.order,
        contentHash: null,
        document: operation.content,
        state: "created",
        contentChanged: true,
        metadataChanged: true,
      };
      validatePageFields(created);
      pages.set(operation.clientId, created);
      continue;
    }

    const existing = pages.get(operation.pageId);
    if (existing?.state !== "existing") {
      fail(`Page ${operation.pageId} does not exist in the draft`);
    }
    touchedExistingPageIds.add(operation.pageId);

    if (operation.kind === "delete") {
      pages.delete(operation.pageId);
      deletedPageIds.push(operation.pageId);
      continue;
    }

    const updated: PlannedAiPage = {
      ...existing,
      parentId:
        operation.parentRef === undefined
          ? existing.parentId
          : (operation.parentRef ?? undefined),
      title: operation.title?.trim() ?? existing.title,
      slug: operation.slug?.trim().toLowerCase() ?? existing.slug,
      icon:
        operation.icon === undefined
          ? existing.icon
          : (operation.icon ?? undefined),
      order: operation.order ?? existing.order,
      document: operation.content ?? existing.document,
      contentChanged: operation.content !== undefined,
      metadataChanged:
        operation.parentRef !== undefined ||
        operation.title !== undefined ||
        operation.slug !== undefined ||
        operation.icon !== undefined ||
        operation.order !== undefined,
    };
    validatePageFields(updated);
    pages.set(operation.pageId, updated);
  }

  const preconditions = new Map<string, string | null>();
  for (const precondition of input.expectedContentHashes) {
    if (precondition.pageId.length > MAX_AI_PAGE_REFERENCE_LENGTH) {
      fail("Content hash page reference is too long");
    }
    if (
      precondition.contentHash !== null &&
      precondition.contentHash.length > MAX_AI_FINGERPRINT_LENGTH
    ) {
      fail(`Content hash precondition for ${precondition.pageId} is too long`);
    }
    if (preconditions.has(precondition.pageId)) {
      fail(`Duplicate content hash precondition for ${precondition.pageId}`);
    }
    preconditions.set(precondition.pageId, precondition.contentHash);
  }
  for (const pageId of touchedExistingPageIds) {
    if (!preconditions.has(pageId)) {
      fail(`Missing content hash precondition for touched page ${pageId}`);
    }
    const snapshot = input.pages.find((page) => page.pageId === pageId);
    if (preconditions.get(pageId) !== snapshot?.contentHash) {
      fail(`Page ${pageId} changed after the workspace was exported`);
    }
  }
  for (const pageId of preconditions.keys()) {
    if (!touchedExistingPageIds.has(pageId)) {
      fail(`Content hash precondition provided for untouched page ${pageId}`);
    }
  }

  if (pages.size === 0) fail("A site must contain at least one page");
  if (pages.size > MAX_AI_SITE_PAGES) {
    fail(`Site would exceed the ${MAX_AI_SITE_PAGES} page capacity`);
  }
  validateTree(pages);
  validateSlugsAndOrders(pages);

  const defaultPageRef =
    input.defaultPageRef ?? input.currentDefaultPageId ?? "";
  if (!defaultPageRef || !pages.has(defaultPageRef)) {
    fail("The default page must reference an active page in the changeset");
  }

  return {
    pages: [...pages.values()],
    deletedPageIds,
    defaultPageRef,
    touchedExistingPageIds: [...touchedExistingPageIds],
  };
}
