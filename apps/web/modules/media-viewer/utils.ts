/**
 * Media Viewer Utilities
 *
 * Helper functions for handling file URLs and blob creation
 */

/**
 * Fetch a file and create a blob URL for viewing
 * This bypasses Content-Disposition: attachment headers from CDNs
 */
export async function createBlobUrl(
  url: string,
  contentType?: string,
): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status}`);
  }
  const blob = await response.blob();
  // Use provided content type or fall back to response type
  const finalBlob = contentType
    ? new Blob([blob], { type: contentType })
    : blob;
  return URL.createObjectURL(finalBlob);
}

/**
 * Revoke a blob URL to free memory
 */
export function revokeBlobUrl(url: string): void {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

/**
 * Check if a URL is already a blob URL
 */
export function isBlobUrl(url: string): boolean {
  return url.startsWith("blob:");
}

/**
 * Check if a content type is an Office document
 */
function isOfficeDocument(contentType?: string): boolean {
  if (!contentType) return false;
  const type = contentType.toLowerCase();
  return (
    type.includes("officedocument") ||
    type.includes("msword") ||
    type.includes("ms-excel") ||
    type.includes("ms-powerpoint") ||
    type.includes("opendocument")
  );
}

/**
 * Convert a relative URL to an absolute public URL
 */
function toAbsoluteUrl(url: string): string {
  if (typeof window === "undefined") return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${window.location.origin}${url}`;
}

/**
 * Open a file in a new tab by creating a blob URL
 * This works around Content-Disposition: attachment headers
 */
export async function openInNewTab(
  url: string,
  contentType?: string,
): Promise<void> {
  try {
    // For Office documents, open in Microsoft Office Online viewer
    // Use absolute URL since Microsoft's viewer needs to access the file externally
    if (isOfficeDocument(contentType)) {
      const absoluteUrl = toAbsoluteUrl(url);
      const viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(absoluteUrl)}`;
      window.open(viewerUrl, "_blank");
      return;
    }

    const blobUrl = await createBlobUrl(url, contentType);
    const newWindow = window.open(blobUrl, "_blank");

    // Revoke the blob URL after the window loads (with delay to ensure it loads)
    if (newWindow) {
      // Keep the blob URL alive for a bit to allow the content to load
      setTimeout(() => {
        revokeBlobUrl(blobUrl);
      }, 60000); // Revoke after 1 minute
    }
  } catch (error) {
    console.error("Failed to open in new tab:", error);
    // Fallback to direct URL (will trigger download but at least it's something)
    window.open(url, "_blank");
  }
}
