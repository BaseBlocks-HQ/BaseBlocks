import {
  fingerprintSnapshot,
  fingerprintSnapshotManifest,
  fingerprintSnapshotPage,
  type Snapshot,
} from "@openeditor/workspace";
import { AiWorkspaceValidationError } from "./aiWorkspaceBounds";

export type AiPageFingerprintPrecondition = {
  pageId: string;
  expectedFingerprint: string | null;
  nextFingerprint?: string;
};

export async function fingerprintAiProjectTrustRoot(project: Snapshot) {
  return {
    projectFingerprint: await fingerprintSnapshot(project),
    siteFingerprint: await fingerprintSnapshotManifest(project),
  };
}

function fail(message: string): never {
  throw new AiWorkspaceValidationError(message);
}

/** Verify the complete OpenEditor trust root inside the write transaction. */
export async function assertAiWorkspaceFingerprints(input: {
  currentProject: Snapshot;
  nextProject: Snapshot;
  expectedProjectFingerprint: string;
  expectedSiteFingerprint: string;
  nextSiteFingerprint: string;
  pageFingerprints: AiPageFingerprintPrecondition[];
}): Promise<{
  expectedProjectFingerprint: string;
  resultProjectFingerprint: string;
  expectedSiteFingerprint: string;
  resultSiteFingerprint: string;
}> {
  const currentTrust = await fingerprintAiProjectTrustRoot(
    input.currentProject,
  );
  const currentProjectFingerprint = currentTrust.projectFingerprint;
  if (currentProjectFingerprint !== input.expectedProjectFingerprint) {
    fail("The OpenEditor project fingerprint no longer matches");
  }
  if (currentTrust.siteFingerprint !== input.expectedSiteFingerprint) {
    fail("The OpenEditor site fingerprint no longer matches");
  }
  const resultTrust = await fingerprintAiProjectTrustRoot(input.nextProject);
  if (resultTrust.siteFingerprint !== input.nextSiteFingerprint) {
    fail("The OpenEditor next-site fingerprint is invalid");
  }

  const currentPages = new Map(
    input.currentProject.pages.map((page) => [page.id, page]),
  );
  const nextPages = new Map(
    input.nextProject.pages.map((page) => [page.id, page]),
  );
  for (const precondition of input.pageFingerprints) {
    const current = currentPages.get(precondition.pageId);
    if (precondition.expectedFingerprint === null) {
      if (current) fail(`Created page ${precondition.pageId} already exists`);
    } else if (
      !current ||
      (await fingerprintSnapshotPage(current)) !==
        precondition.expectedFingerprint
    ) {
      fail(`Page ${precondition.pageId} fingerprint no longer matches`);
    }

    if (precondition.nextFingerprint !== undefined) {
      const next = nextPages.get(precondition.pageId);
      if (
        !next ||
        (await fingerprintSnapshotPage(next)) !== precondition.nextFingerprint
      ) {
        fail(`Page ${precondition.pageId} next fingerprint is invalid`);
      }
    } else if (nextPages.has(precondition.pageId)) {
      fail(`Deleted page ${precondition.pageId} remains in the next project`);
    }
  }
  return {
    expectedProjectFingerprint: currentProjectFingerprint,
    resultProjectFingerprint: resultTrust.projectFingerprint,
    expectedSiteFingerprint: input.expectedSiteFingerprint,
    resultSiteFingerprint: input.nextSiteFingerprint,
  };
}
