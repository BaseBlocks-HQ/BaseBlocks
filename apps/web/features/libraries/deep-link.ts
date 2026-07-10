export const FILE_SEARCH_PARAM = "file";

export function buildFileDeepLinkPath(
  pathname: string,
  currentSearchParams: string,
  documentId: string | null,
): string {
  const params = new URLSearchParams(currentSearchParams);
  if (documentId) {
    params.set(FILE_SEARCH_PARAM, documentId);
  } else {
    params.delete(FILE_SEARCH_PARAM);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function toAbsoluteBrowserUrl(path: string): string {
  if (typeof window === "undefined") {
    return path;
  }

  return new URL(path, window.location.origin).toString();
}
