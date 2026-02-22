"use client";

import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { useQuery } from "convex/react";

/** Fetch a page by ID */
export function usePage(pageId: Id<"pages"> | string | undefined) {
  return useQuery(
    api.pages.queries.get,
    pageId ? { pageId: pageId as Id<"pages"> } : "skip",
  );
}

/** Fetch all pages for a site */
export function usePages(siteId: Id<"sites"> | string | undefined) {
  return useQuery(
    api.pages.queries.list,
    siteId ? { siteId: siteId as Id<"sites"> } : "skip",
  );
}

/** Fetch ancestor pages for breadcrumb navigation */
export function usePageAncestors(pageId: Id<"pages"> | string | undefined) {
  return useQuery(
    api.pages.queries.getAncestors,
    pageId ? { pageId: pageId as Id<"pages"> } : "skip",
  );
}

/** Fetch layouts for a page (editor/draft) */
export function useLayouts(pageId: Id<"pages"> | string | undefined) {
  return useQuery(
    api.layouts.queries.list,
    pageId ? { pageId: pageId as Id<"pages"> } : "skip",
  );
}

/** Fetch published layouts for a page (public site) */
export function usePublishedLayouts(pageId: Id<"pages"> | string | undefined) {
  return useQuery(
    api.layouts.queries.listPublished,
    pageId ? { pageId: pageId as Id<"pages"> } : "skip",
  );
}
