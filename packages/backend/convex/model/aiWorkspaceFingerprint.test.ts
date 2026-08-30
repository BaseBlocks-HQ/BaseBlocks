import { describe, expect, test } from "bun:test";
import {
  fingerprintSnapshot,
  fingerprintSnapshotManifest,
  fingerprintSnapshotPage,
  type Snapshot,
} from "@openeditor/workspace";
import { assertAiWorkspaceFingerprints } from "./aiWorkspaceFingerprint";

const document = { type: "doc" as const, version: 1 as const, content: [] };
const current: Snapshot = {
  id: "site-1",
  revision: "4",
  title: "Site",
  metadata: { defaultPageId: "home" },
  pages: [
    {
      id: "home",
      title: "Home",
      slug: "home",
      parentId: null,
      order: 0,
      metadata: { icon: null },
      document,
    },
  ],
};

describe("OpenEditor atomic fingerprint checks", () => {
  test("accepts the complete unchanged-to-updated trust chain", async () => {
    const next = structuredClone(current);
    next.pages[0]!.title = "Welcome";
    await expect(
      assertAiWorkspaceFingerprints({
        currentProject: current,
        nextProject: next,
        expectedProjectFingerprint: await fingerprintSnapshot(current),
        expectedSiteFingerprint: await fingerprintSnapshotManifest(current),
        nextSiteFingerprint: await fingerprintSnapshotManifest(next),
        pageFingerprints: [
          {
            pageId: "home",
            expectedFingerprint: await fingerprintSnapshotPage(
              current.pages[0]!,
            ),
            nextFingerprint: await fingerprintSnapshotPage(next.pages[0]!),
          },
        ],
      }),
    ).resolves.toMatchObject({
      expectedProjectFingerprint: await fingerprintSnapshot(current),
      resultProjectFingerprint: await fingerprintSnapshot(next),
    });
  });

  test("rejects stale current and forged next fingerprints", async () => {
    await expect(
      assertAiWorkspaceFingerprints({
        currentProject: current,
        nextProject: current,
        expectedProjectFingerprint: "stale",
        expectedSiteFingerprint: await fingerprintSnapshotManifest(current),
        nextSiteFingerprint: await fingerprintSnapshotManifest(current),
        pageFingerprints: [],
      }),
    ).rejects.toThrow("project fingerprint no longer matches");
  });
});
