import { describe, expect, test } from "bun:test";
import { createAiChangesetResultDigest } from "./aiChangesetAudit";

const value = {
  runId: "run-1",
  modelId: "openai/gpt-5.6",
  expectedProjectFingerprint: "project-before",
  resultProjectFingerprint: "project-after",
  expectedSiteFingerprint: "site-before",
  resultSiteFingerprint: "site-after",
  expectedPageFingerprints: [{ pageId: "home", fingerprint: "before" }],
  resultPageFingerprints: [{ pageId: "home", fingerprint: "after" }],
  draftRevision: 2,
  createdPageIds: [],
  updatedPageIds: ["home"],
  deletedPageIds: [],
  contentHashes: [{ pageId: "home", contentHash: "sha256:value" }],
};

describe("AI changeset audit digest", () => {
  test("is versioned, deterministic, and bound to model and result trust roots", () => {
    const digest = createAiChangesetResultDigest(value);
    expect(digest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(createAiChangesetResultDigest(value)).toBe(digest);
    expect(
      createAiChangesetResultDigest({ ...value, modelId: "other/model" }),
    ).not.toBe(digest);
    expect(
      createAiChangesetResultDigest({
        ...value,
        resultProjectFingerprint: "forged",
      }),
    ).not.toBe(digest);
  });
});
