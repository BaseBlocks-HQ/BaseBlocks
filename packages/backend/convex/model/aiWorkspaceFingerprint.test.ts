import { describe, expect, test } from "bun:test";
import {
  fingerprintProjectPage,
  fingerprintProjectSnapshot,
  fingerprintSiteManifest,
  type OpenEditorProjectSnapshot,
} from "@openeditor/workspace";
import { assertAiWorkspaceFingerprints } from "./aiWorkspaceFingerprint";

const document = { type: "doc" as const, version: 1 as const, content: [] };
const current: OpenEditorProjectSnapshot = {
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

function manifest(project: OpenEditorProjectSnapshot) {
  return {
    format: "openeditor.site" as const,
    version: 1 as const,
    project: {
      id: project.id,
      revision: project.revision,
      title: project.title,
      metadata: project.metadata,
    },
    pages: project.pages.map((page) => ({
      id: page.id,
      file: `pages/${page.id}.json`,
      title: page.title,
      slug: page.slug,
      parentId: page.parentId,
      order: page.order,
      metadata: page.metadata,
    })),
  };
}

describe("OpenEditor atomic fingerprint checks", () => {
  test("accepts the complete unchanged-to-updated trust chain", async () => {
    const next = structuredClone(current);
    next.pages[0]!.title = "Welcome";
    await expect(
      assertAiWorkspaceFingerprints({
        currentProject: current,
        nextProject: next,
        expectedProjectFingerprint: await fingerprintProjectSnapshot(current),
        expectedSiteFingerprint: await fingerprintSiteManifest(
          manifest(current),
        ),
        nextSiteFingerprint: await fingerprintSiteManifest(manifest(next)),
        pageFingerprints: [
          {
            pageId: "home",
            expectedFingerprint: await fingerprintProjectPage(
              current.pages[0]!,
            ),
            nextFingerprint: await fingerprintProjectPage(next.pages[0]!),
          },
        ],
      }),
    ).resolves.toMatchObject({
      expectedProjectFingerprint: await fingerprintProjectSnapshot(current),
      resultProjectFingerprint: await fingerprintProjectSnapshot(next),
    });
  });

  test("rejects stale current and forged next fingerprints", async () => {
    await expect(
      assertAiWorkspaceFingerprints({
        currentProject: current,
        nextProject: current,
        expectedProjectFingerprint: "stale",
        expectedSiteFingerprint: await fingerprintSiteManifest(
          manifest(current),
        ),
        nextSiteFingerprint: await fingerprintSiteManifest(manifest(current)),
        pageFingerprints: [],
      }),
    ).rejects.toThrow("project fingerprint no longer matches");
  });
});
