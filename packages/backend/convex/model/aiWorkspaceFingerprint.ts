import {
  fingerprintProjectPage,
  fingerprintProjectSnapshot,
  fingerprintSiteManifest,
  type OpenEditorProjectSnapshot,
  type WorkspaceSiteManifest,
} from "@openeditor/workspace";
import { AiChangesetValidationError } from "./aiChangesetPlan";

export type AiPageFingerprintPrecondition = {
  pageId: string;
  expectedFingerprint: string | null;
  nextFingerprint?: string;
};

const siteManifest = (
  project: OpenEditorProjectSnapshot,
): WorkspaceSiteManifest => ({
  format: "openeditor.site",
  version: 1,
  project: {
    id: project.id,
    revision: project.revision,
    title: project.title,
    ...(project.metadata !== undefined ? { metadata: project.metadata } : {}),
  },
  pages: project.pages.map((page) => ({
    id: page.id,
    file: `pages/${page.id}.json`,
    title: page.title,
    ...(page.slug !== undefined ? { slug: page.slug } : {}),
    ...(page.route !== undefined ? { route: page.route } : {}),
    ...(page.parentId !== undefined ? { parentId: page.parentId } : {}),
    ...(page.order !== undefined ? { order: page.order } : {}),
    ...(page.metadata !== undefined ? { metadata: page.metadata } : {}),
  })),
});

export async function fingerprintAiProjectTrustRoot(
  project: OpenEditorProjectSnapshot,
) {
  return {
    projectFingerprint: await fingerprintProjectSnapshot(project),
    siteFingerprint: await fingerprintSiteManifest(siteManifest(project)),
  };
}

function fail(message: string): never {
  throw new AiChangesetValidationError(message);
}

/** Verify the complete OpenEditor trust root inside the write transaction. */
export async function assertAiWorkspaceFingerprints(input: {
  currentProject: OpenEditorProjectSnapshot;
  nextProject: OpenEditorProjectSnapshot;
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
      (await fingerprintProjectPage(current)) !==
        precondition.expectedFingerprint
    ) {
      fail(`Page ${precondition.pageId} fingerprint no longer matches`);
    }

    if (precondition.nextFingerprint !== undefined) {
      const next = nextPages.get(precondition.pageId);
      if (
        !next ||
        (await fingerprintProjectPage(next)) !== precondition.nextFingerprint
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
