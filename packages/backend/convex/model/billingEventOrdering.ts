export function shouldApplyProviderUpdate(
  currentModifiedAt: number | undefined,
  incomingModifiedAt: number,
): boolean {
  return (
    currentModifiedAt === undefined || incomingModifiedAt >= currentModifiedAt
  );
}
