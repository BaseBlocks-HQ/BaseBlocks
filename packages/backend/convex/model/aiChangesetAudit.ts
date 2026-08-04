import { hashOpenEditorContent } from "../pageContentFormat";

export function createAiChangesetResultDigest(value: {
  runId: string;
  modelId: string;
  expectedProjectFingerprint: string;
  resultProjectFingerprint: string;
  expectedSiteFingerprint: string;
  resultSiteFingerprint: string;
  expectedPageFingerprints: unknown[];
  resultPageFingerprints: unknown[];
  draftRevision: number;
  createdPageIds: readonly string[];
  updatedPageIds: readonly string[];
  deletedPageIds: readonly string[];
  contentHashes: readonly unknown[];
}) {
  return hashOpenEditorContent(JSON.stringify(value));
}
