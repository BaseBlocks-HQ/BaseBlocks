import type { Doc } from "../_generated/dataModel";

export function publicationActionForTarget(
  currentNumber: number | undefined,
  targetNumber: number,
): "rollback" | "republish" {
  return currentNumber !== undefined && targetNumber < currentNumber
    ? "rollback"
    : "republish";
}

export type PublicationStatus = "building" | "clearing" | "complete" | "failed";

/** Compatibility state helpers for releases created by the retired workflow. */
export function isPublicationInFlight(
  status: PublicationStatus | undefined,
): boolean {
  return status === "building" || status === "clearing";
}

export function extractionBlocksPublication(
  status: "queued" | "processing" | "ready" | "failed",
): boolean {
  return status === "queued" || status === "processing";
}

export function extractionRetryInvalidatesDraft(
  status: "queued" | "processing" | "ready" | "failed" | undefined,
): boolean {
  return status === undefined || status === "ready" || status === "failed";
}

export function extractionIsPublishable(
  extraction:
    | {
        status: "queued" | "processing" | "ready" | "failed";
        sourceVersion: string;
      }
    | null
    | undefined,
  expectedSourceVersion: string,
): boolean {
  return (
    extraction?.sourceVersion === expectedSourceVersion &&
    (extraction.status === "ready" || extraction.status === "failed")
  );
}

/**
 * Old releases may still carry a publication workflow status. New releases
 * activate atomically and have no status, so an absent status is readable.
 */
export function isReleaseAvailable(
  release: Pick<Doc<"siteReleases">, "publicationStatus">,
): boolean {
  return (
    release.publicationStatus === undefined ||
    release.publicationStatus === "complete" ||
    release.publicationStatus === "clearing"
  );
}
