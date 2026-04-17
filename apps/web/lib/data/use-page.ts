"use client";

import { getStoredAccessSessionTokens } from "@/lib/public-site/access-session";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { useQuery } from "convex/react";

export function usePage(pageId: Id<"pages"> | string | undefined) {
  const sessionTokens = getStoredAccessSessionTokens();
  return useQuery(
    api.pages.queries.get,
    pageId ? { pageId: pageId as Id<"pages">, sessionTokens } : "skip",
  );
}

export function usePages(siteId: Id<"sites"> | string | undefined) {
  return useQuery(
    api.pages.queries.list,
    siteId ? { siteId: siteId as Id<"sites"> } : "skip",
  );
}

export function usePageAncestors(pageId: Id<"pages"> | string | undefined) {
  const sessionTokens = getStoredAccessSessionTokens();
  return useQuery(
    api.pages.queries.getAncestors,
    pageId ? { pageId: pageId as Id<"pages">, sessionTokens } : "skip",
  );
}

export function useLayouts(pageId: Id<"pages"> | string | undefined) {
  return useQuery(
    api.layouts.queries.list,
    pageId ? { pageId: pageId as Id<"pages"> } : "skip",
  );
}

export function usePublishedLayouts(pageId: Id<"pages"> | string | undefined) {
  const sessionTokens = getStoredAccessSessionTokens();
  return useQuery(
    api.layouts.queries.listPublished,
    pageId ? { pageId: pageId as Id<"pages">, sessionTokens } : "skip",
  );
}
