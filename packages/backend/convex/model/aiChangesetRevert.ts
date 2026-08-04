export function assertAiChangesetCanRevert(input: {
  isLatestUnrevertedOperation: boolean;
  revertedAt?: number;
}) {
  if (input.revertedAt) throw new Error("AI change was already reverted");
  if (!input.isLatestUnrevertedOperation) {
    throw new Error("A newer AI change must be reverted first");
  }
}
