import { buildPathWithUpdatedSearchParams } from "@/modules/routing/search-params";

export const FILE_SEARCH_PARAM = "file";

export function buildFileDeepLinkPath(
  pathname: string,
  currentSearchParams: string,
  documentId: string | null,
): string {
  return buildPathWithUpdatedSearchParams(pathname, currentSearchParams, {
    [FILE_SEARCH_PARAM]: documentId,
  });
}

export function toAbsoluteBrowserUrl(path: string): string {
  if (typeof window === "undefined") {
    return path;
  }

  return new URL(path, window.location.origin).toString();
}
