import { describe, expect, test } from "bun:test";
import {
  InMemoryWorkspaceFileStore,
  OPENEDITOR_SITE_PATH,
  pagePath,
} from "@openeditor/workspace";
import { createDocument, textBlock } from "@openeditor/core";
import {
  createEditorAiOrchestrator,
  EditorAiValidationError,
} from "./orchestrator";
import type {
  BaseBlocksApplyChangesetInput,
  BaseBlocksWorkspaceSnapshot,
  EditorAiBackend,
  EditorAiRunner,
  EditorAiRunnerInput,
} from "./types";

const TEST_BUDGET = {
  maxRequests: 40,
  maxInputTokens: 100_000,
  maxOutputTokens: 20_000,
  maxChargeUnits: 10_000_000n,
};

const TEST_ATTRIBUTION = {
  runId: "run-1",
  organizationId: "organization-1",
  actorId: "actor-1",
  feature: "editorAgent",
  environment: "sandbox" as const,
  policyVersion: "test-v1",
};

const TEST_TELEMETRY = {
  inputTokens: 100,
  outputTokens: 50,
  steps: 1,
  generationIds: ["gen_test"],
  gatewayCostUnits: 100n,
  retailChargeUnits: 125n,
};

function snapshot(): BaseBlocksWorkspaceSnapshot {
  return {
    format: "openeditor-workspace",
    version: 1,
    site: {
      siteId: "site-1",
      name: "Documentation",
      slug: "docs",
      defaultPageId: "page-1",
      draftRevision: 7,
      settings: { theme: { palette: "neutral" } },
    },
    pages: [
      {
        pageId: "page-1",
        title: "Home",
        slug: "home",
        order: 0,
        contentHash: "hash-1",
        document: createDocument([textBlock("paragraph", "Before")]),
      },
    ],
    references: { libraries: [], files: [] },
    trust: {
      projectFingerprint: "project-fingerprint-1",
      siteFingerprint: "site-fingerprint-1",
      pageFingerprints: [
        { pageId: "page-1", fingerprint: "page-fingerprint-1" },
      ],
    },
  };
}

class FakeBackend implements EditorAiBackend {
  applied: BaseBlocksApplyChangesetInput[] = [];
  revision = 7;

  async exportDraft() {
    const value = snapshot();
    value.site.draftRevision = this.revision;
    return value;
  }

  async applyChangeset(input: BaseBlocksApplyChangesetInput) {
    this.applied.push(input);
    this.revision = 8;
    return {
      draftRevision: 8,
      createdPages: [{ clientId: "new-page", pageId: "persisted-page" }],
      contentHashes: [{ pageId: "page-1", contentHash: "hash-2" }],
      auditId: "audit-1",
    };
  }
}

class EditingRunner implements EditorAiRunner {
  readonly modelId = "test/model";

  async run(input: EditorAiRunnerInput) {
    const store = new InMemoryWorkspaceFileStore(input.materialization.files);
    const path = pagePath("page-1");
    const raw = await store.readFile(path);
    if (!raw) throw new Error("Missing page fixture");
    const page = JSON.parse(raw) as {
      content: Array<{ content?: Array<{ text?: string }> }>;
    };
    const text = page.content[0]?.content?.[0];
    if (!text) throw new Error("Missing text fixture");
    text.text = "After";
    await store.writeFile(path, `${JSON.stringify(page, null, 2)}\n`);
    return {
      store,
      outcome: "edited" as const,
      summary: "Updated the home page.",
      telemetry: TEST_TELEMETRY,
    };
  }
}

class InvalidBlockRunner implements EditorAiRunner {
  readonly modelId = "test/model";

  async run(input: EditorAiRunnerInput) {
    const store = new InMemoryWorkspaceFileStore(input.materialization.files);
    const path = pagePath("page-1");
    const raw = await store.readFile(path);
    if (!raw) throw new Error("Missing page fixture");
    const page = JSON.parse(raw) as Record<string, unknown>;
    Object.assign(page, {
      type: "doc",
      version: 1,
      content: [
        { type: "baseblocksSearch", attrs: { search: { injected: true } } },
      ],
    });
    await store.writeFile(path, JSON.stringify(page));
    return {
      store,
      outcome: "edited" as const,
      summary: "Invalid edit",
      telemetry: TEST_TELEMETRY,
    };
  }
}

class SiteRenameRunner implements EditorAiRunner {
  readonly modelId = "test/model";

  async run(input: EditorAiRunnerInput) {
    const store = new InMemoryWorkspaceFileStore(input.materialization.files);
    const raw = await store.readFile(OPENEDITOR_SITE_PATH);
    if (!raw) throw new Error("Missing site fixture");
    const site = JSON.parse(raw) as { project: { title: string } };
    site.project.title = "Unified terminology";
    await store.writeFile(
      OPENEDITOR_SITE_PATH,
      `${JSON.stringify(site, null, 2)}\n`,
    );
    return {
      store,
      outcome: "edited" as const,
      summary: "Renamed the site.",
      telemetry: TEST_TELEMETRY,
    };
  }
}

class AnsweringRunner implements EditorAiRunner {
  readonly modelId = "test/model";

  async run(input: EditorAiRunnerInput) {
    return {
      store: new InMemoryWorkspaceFileStore(input.materialization.files),
      outcome: "answered" as const,
      summary: "This site has one page: Home (/home).",
      telemetry: TEST_TELEMETRY,
    };
  }
}

class NoOpEditingRunner implements EditorAiRunner {
  readonly modelId = "test/model";

  async run(input: EditorAiRunnerInput) {
    return {
      store: new InMemoryWorkspaceFileStore(input.materialization.files),
      outcome: "edited" as const,
      summary: "I changed the site.",
      telemetry: TEST_TELEMETRY,
    };
  }
}

const admission = {
  admit: async () => ({
    budget: TEST_BUDGET,
    attribution: TEST_ATTRIBUTION,
    settle: async () => "settled" as const,
    completeAnswer: async () => {},
    fail: async () => {},
  }),
};

describe("editor AI orchestrator", () => {
  test("applies through the revisioned BaseBlocks backend boundary", async () => {
    const backend = new FakeBackend();
    const run = createEditorAiOrchestrator({
      backend,
      admission: {
        admit: async () => ({
          budget: TEST_BUDGET,
          attribution: TEST_ATTRIBUTION,
          settle: async () => "settled" as const,
          completeAnswer: async () => {},
          fail: async () => {},
        }),
      },
      runner: new EditingRunner(),
    });
    const result = await run({
      siteId: "site-1",
      prompt: "Update the copy",
      requestId: "request-1",
      conversationId: "conversation-1",
    });

    expect(result.applied?.draftRevision).toBe(8);
    expect(
      "proposalAuthoritative" in result && result.proposalAuthoritative,
    ).toBe(false);
    expect(
      "authoritative" in result && result.authoritative?.pageIdMap["new-page"],
    ).toBe("persisted-page");
    expect(backend.applied).toHaveLength(1);
    expect(backend.applied[0]).toMatchObject({
      siteId: "site-1",
      expectedDraftRevision: 7,
      expectedContentHashes: [{ pageId: "page-1", contentHash: "hash-1" }],
      requestId: "request-1",
      conversationId: "conversation-1",
      nextSiteName: "Documentation",
    });
    expect(backend.applied[0]?.expectedProjectFingerprint).toBeTruthy();
    expect(backend.applied[0]?.expectedSiteFingerprint).toBeTruthy();
    expect(backend.applied[0]?.nextSiteFingerprint).toBeTruthy();
    expect(backend.applied[0]?.pageFingerprints).toHaveLength(1);
  });

  test("applies a project-only site terminology rename", async () => {
    const backend = new FakeBackend();
    const run = createEditorAiOrchestrator({
      backend,
      admission,
      runner: new SiteRenameRunner(),
    });
    const result = await run({
      siteId: "site-1",
      prompt: "Use Unified terminology as the site name",
      requestId: "request-site-rename-1",
    });
    expect("changeset" in result && result.changeset.pageChanges).toHaveLength(
      0,
    );
    expect(backend.applied[0]?.operations).toHaveLength(0);
    expect(backend.applied[0]?.nextSiteName).toBe("Unified terminology");
  });

  test("completes a read-only answer without applying a changeset", async () => {
    const backend = new FakeBackend();
    const completions: Array<{ summary: string }> = [];
    const run = createEditorAiOrchestrator({
      backend,
      admission: {
        admit: async () => ({
          budget: TEST_BUDGET,
          attribution: TEST_ATTRIBUTION,
          settle: async () => "settled" as const,
          completeAnswer: async (value) => {
            completions.push(value);
          },
          fail: async () => {},
        }),
      },
      runner: new AnsweringRunner(),
    });
    const result = await run({
      siteId: "site-1",
      prompt: "List the pages",
      requestId: "request-answer-1",
      conversationId: "conversation-1",
    });

    expect(result.outcome).toBe("answered");
    expect(result.summary).toContain("Home");
    expect(completions).toEqual([
      {
        conversationId: "conversation-1",
        summary: "This site has one page: Home (/home).",
        telemetry: TEST_TELEMETRY,
      },
    ]);
    expect(backend.applied).toHaveLength(0);
  });

  test("delivers an answer while authoritative Gateway cost is still reconciling", async () => {
    const completions: Array<{ summary: string }> = [];
    const failures: string[] = [];
    const reconciliationRuns: string[] = [];
    const run = createEditorAiOrchestrator({
      backend: new FakeBackend(),
      admission: {
        admit: async () => ({
          budget: TEST_BUDGET,
          attribution: TEST_ATTRIBUTION,
          settle: async () => "reconcilePending" as const,
          completeAnswer: async (value) => {
            completions.push(value);
          },
          fail: async (code) => {
            failures.push(code);
          },
        }),
      },
      runner: new AnsweringRunner(),
      onReconciliationPending: (runId) => {
        reconciliationRuns.push(runId);
      },
    });

    const result = await run({
      siteId: "site-1",
      prompt: "List the pages",
      requestId: "request-pending-cost-1",
      conversationId: "conversation-1",
    });

    expect(result.outcome).toBe("answered");
    expect(completions).toHaveLength(1);
    expect(failures).toEqual([]);
    expect(reconciliationRuns).toEqual(["run-1"]);
  });

  test("rejects an edit completion with no semantic changes", async () => {
    const backend = new FakeBackend();
    const run = createEditorAiOrchestrator({
      backend,
      admission,
      runner: new NoOpEditingRunner(),
    });

    await expect(
      run({
        siteId: "site-1",
        prompt: "Change the home page",
        requestId: "request-no-op-edit-1",
      }),
    ).rejects.toThrow("declared an edit but produced no semantic site changes");
    expect(backend.applied).toHaveLength(0);
  });

  test("rejects documents outside the BaseBlocks custom contract", async () => {
    const run = createEditorAiOrchestrator({
      backend: new FakeBackend(),
      admission,
      runner: new InvalidBlockRunner(),
    });
    await expect(
      run({
        siteId: "site-1",
        prompt: "Make an invalid block",
        requestId: "request-invalid-1",
      }),
    ).rejects.toBeInstanceOf(EditorAiValidationError);
  });

  test("rejects cancellation before export or runner execution", async () => {
    let receivedSignal: AbortSignal | undefined;
    const backend = new FakeBackend();
    let exports = 0;
    backend.exportDraft = async () => {
      exports += 1;
      return snapshot();
    };
    const runner: EditorAiRunner = {
      modelId: "test/model",
      run: async (input) => {
        receivedSignal = input.abortSignal;
        if (!input.abortSignal.aborted)
          throw new Error("Expected cancellation");
        return {
          store: new InMemoryWorkspaceFileStore(input.materialization.files),
          outcome: "edited",
          summary: "cancelled",
        };
      },
    };
    const controller = new AbortController();
    controller.abort(new Error("client disconnected"));
    const run = createEditorAiOrchestrator({
      backend: new FakeBackend(),
      admission,
      runner,
    });
    await expect(
      run({
        siteId: "site-1",
        prompt: "No-op",
        requestId: "request-cancelled-1",
        abortSignal: controller.signal,
      }),
    ).rejects.toThrow();
    expect(receivedSignal).toBeUndefined();
    expect(exports).toBe(0);
  });

  test("bounds prompts before exporting customer content", async () => {
    let exports = 0;
    const backend = new FakeBackend();
    backend.exportDraft = async () => {
      exports += 1;
      return snapshot();
    };
    const run = createEditorAiOrchestrator({
      backend,
      admission,
      runner: new EditingRunner(),
    });
    await expect(
      run({
        siteId: "site-1",
        prompt: "x".repeat(8_001),
        requestId: "request-too-long-1",
      }),
    ).rejects.toThrow("Prompt exceeds");
    expect(exports).toBe(0);
  });

  test("denies admission before exporting content or creating a runner", async () => {
    let exports = 0;
    let runnerCalls = 0;
    const backend = new FakeBackend();
    backend.exportDraft = async () => {
      exports += 1;
      return snapshot();
    };
    const runner: EditorAiRunner = {
      modelId: "test/model",
      run: async (input) => {
        runnerCalls += 1;
        return {
          store: new InMemoryWorkspaceFileStore(input.materialization.files),
          outcome: "edited",
          summary: "unexpected",
        };
      },
    };
    const run = createEditorAiOrchestrator({
      backend,
      admission: {
        admit: async () => {
          throw new Error("quota denied");
        },
      },
      runner,
    });
    await expect(
      run({
        siteId: "site-1",
        prompt: "Edit",
        requestId: "request-denied-1",
      }),
    ).rejects.toThrow("quota denied");
    expect(exports).toBe(0);
    expect(runnerCalls).toBe(0);
    expect(backend.applied).toHaveLength(0);
  });

  test("does not apply when cancellation arrives after generation", async () => {
    const controller = new AbortController();
    const backend = new FakeBackend();
    const runner: EditorAiRunner = {
      modelId: "test/model",
      run: async (input) => {
        controller.abort(new Error("client disconnected"));
        return {
          store: new InMemoryWorkspaceFileStore(input.materialization.files),
          outcome: "edited",
          summary: "cancelled",
        };
      },
    };
    const run = createEditorAiOrchestrator({
      backend,
      admission,
      runner,
    });
    await expect(
      run({
        siteId: "site-1",
        prompt: "Edit",
        requestId: "request-mid-cancel-1",
        abortSignal: controller.signal,
      }),
    ).rejects.toThrow();
    expect(backend.applied).toHaveLength(0);
  });

  test("replays a durable terminal result before content export", async () => {
    let exports = 0;
    let runnerCalls = 0;
    const backend = new FakeBackend();
    backend.exportDraft = async () => {
      exports += 1;
      return snapshot();
    };
    const run = createEditorAiOrchestrator({
      backend,
      admission: {
        admit: async () => ({
          replay: {
            replayed: true,
            outcome: "applied",
            summary: "Previously completed",
            diagnostics: [],
          },
          completeAnswer: async () => {},
          fail: async () => {},
        }),
      },
      runner: {
        modelId: "test/model",
        run: async (input) => {
          runnerCalls += 1;
          return {
            store: new InMemoryWorkspaceFileStore(input.materialization.files),
            outcome: "edited",
            summary: "unexpected",
          };
        },
      },
    });
    const result = await run({
      siteId: "site-1",
      prompt: "Edit",
      requestId: "request-replay-1",
    });
    expect("replayed" in result && result.replayed).toBe(true);
    expect(exports).toBe(0);
    expect(runnerCalls).toBe(0);
  });

  test("closes the durable lease when a runner fails", async () => {
    const failures: string[] = [];
    const run = createEditorAiOrchestrator({
      backend: new FakeBackend(),
      admission: {
        admit: async () => ({
          budget: TEST_BUDGET,
          attribution: TEST_ATTRIBUTION,
          settle: async () => "settled" as const,
          completeAnswer: async () => {},
          fail: async (code) => {
            failures.push(code);
          },
        }),
      },
      runner: {
        modelId: "test/model",
        run: async () => {
          throw new Error("model failed");
        },
      },
    });
    await expect(
      run({
        siteId: "site-1",
        prompt: "Edit",
        requestId: "request-failure-1",
      }),
    ).rejects.toThrow("model failed");
    expect(failures).toEqual(["run_failed"]);
  });
});
