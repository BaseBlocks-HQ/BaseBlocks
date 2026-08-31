import type { OpenEditorDocument } from "@openeditor/document";

function areOpenEditorValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    return left.every((value, index) =>
      areOpenEditorValuesEqual(value, right[index]),
    );
  }
  if (
    !left ||
    !right ||
    typeof left !== "object" ||
    typeof right !== "object"
  ) {
    return false;
  }

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every(
    (key) =>
      Object.hasOwn(rightRecord, key) &&
      areOpenEditorValuesEqual(leftRecord[key], rightRecord[key]),
  );
}

export function areOpenEditorDocumentsEqual(
  left: OpenEditorDocument,
  right: OpenEditorDocument,
) {
  return areOpenEditorValuesEqual(left, right);
}

export function shouldSyncOpenEditorDocument(
  current: OpenEditorDocument,
  incoming: OpenEditorDocument,
  locallyEmitted?: OpenEditorDocument,
) {
  if (locallyEmitted && areOpenEditorDocumentsEqual(locallyEmitted, incoming)) {
    return false;
  }
  return !areOpenEditorDocumentsEqual(current, incoming);
}
