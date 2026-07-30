export function publicationActionForTarget(
  currentNumber: number | undefined,
  targetNumber: number,
): "rollback" | "republish" {
  return currentNumber !== undefined && targetNumber < currentNumber
    ? "rollback"
    : "republish";
}

export function findReleaseForDraftRevision<
  T extends { sourceDraftRevision: number },
>(releasesNewestFirst: T[], draftRevision: number): T | undefined {
  return releasesNewestFirst.find(
    (release) => release.sourceDraftRevision === draftRevision,
  );
}
