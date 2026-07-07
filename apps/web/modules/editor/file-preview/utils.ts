/**
 * File Preview Utilities
 *
 * Helper functions for handling file URLs and blob creation
 */

/**
 * Fetch a file and create a blob URL for viewing
 * This bypasses Content-Disposition: attachment headers from CDNs
 */
async function createBlobUrl(
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
function revokeBlobUrl(url: string): void {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
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
    const blobUrl = await createBlobUrl(url, contentType);
    const newWindow = window.open(blobUrl, "_blank");

    // Revoke the blob URL after the window loads (with delay to ensure it loads)
    if (newWindow) {
      // Keep the blob URL alive for a bit to allow the content to load
      setTimeout(() => {
        revokeBlobUrl(blobUrl);
      }, 60000); // Revoke after 1 minute
    }
  } catch (_error) {
    // Fallback to direct URL (will trigger download but at least it's something)
    window.open(url, "_blank");
  }
}
