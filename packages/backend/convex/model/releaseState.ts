export function publicationActionForTarget(
  currentNumber: number | undefined,
  targetNumber: number,
): "rollback" | "republish" {
  return currentNumber !== undefined && targetNumber < currentNumber
    ? "rollback"
    : "republish";
}

export type PublicationStatus = "building" | "clearing" | "complete" | "failed";

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
