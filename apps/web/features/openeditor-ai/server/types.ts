import type {
  OpenEditorProjectSnapshot,
  ProjectChangeset,
  WorkspaceFileStore,
  WorkspaceMaterialization,
} from "@openeditor/workspace";

export type BaseBlocksWorkspacePage = {
  pageId: string;
  parentId?: string;
  title: string;
  slug: string;
  icon?: string;
  order: number;
  contentHash: string | null;
  document: unknown;
};

export type BaseBlocksWorkspaceSnapshot = {
  format: "openeditor-workspace";
  version: 1;
  site: {
    siteId: string;
    name: string;
    slug: string;
    defaultPageId?: string;
    draftRevision: number;
    settings: unknown;
  };
  pages: BaseBlocksWorkspacePage[];
  references: {
    libraries: Array<{ libraryId: string; name: string }>;
    files: Array<{
      fileId: string;
      filename: string;
      kind: "file" | "siteAsset";
      contentType: string;
      libraryId?: string;
    }>;
  };
  trust: {
    projectFingerprint: string;
    siteFingerprint: string;
    pageFingerprints: Array<{ pageId: string; fingerprint: string }>;
  };
};

export type EditorAiRunnerInput = {
  materialization: WorkspaceMaterialization;
  prompt: string;
  abortSignal: AbortSignal;
  budget: EditorAiRunBudget;
  attribution: {
    runId: string;
    organizationId: string;
    actorId: string;
    feature: string;
    environment: "sandbox" | "production";
    policyVersion: string;
  };
};

export type EditorAiRunBudget = {
  maxRequests: number;
  maxInputTokens: number;
  maxOutputTokens: number;
  maxChargeUnits: bigint;
};

export type EditorAiRunnerOutput = {
  store: WorkspaceFileStore;
  outcome: "answered" | "edited";
  summary: string;
  telemetry?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    steps?: number;
    toolCalls?: number;
    generationIds?: string[];
    generationSummaries?: Array<{
      generationId: string;
      totalCostUnits: bigint;
      retailChargeUnits: bigint;
      resolvedModelId: string;
      provider: string;
      inputTokens: number;
      outputTokens: number;
      reasoningTokens: number;
      cachedInputTokens: number;
      cacheCreationTokens: number;
      webSearchCalls: number;
      latencyMs: number;
      finishReason: string;
    }>;
    finishReason?: string;
    warningCount?: number;
    toolNames?: string[];
    gatewayCostUsd?: number;
    gatewayCostUnits?: bigint;
    retailChargeUnits?: bigint;
    requestedModelId?: string;
    resolvedModelId?: string;
    provider?: string;
    environment?: "sandbox" | "production";
    feature?: string;
  };
};

export interface EditorAiRunner {
  readonly modelId: string;
  run(input: EditorAiRunnerInput): Promise<EditorAiRunnerOutput>;
}

export interface EditorAiBackend {
  exportDraft(siteId: string): Promise<BaseBlocksWorkspaceSnapshot | null>;
  applyChangeset(input: BaseBlocksApplyChangesetInput): Promise<{
    draftRevision: number;
    createdPages: Array<{ clientId: string; pageId: string }>;
    contentHashes: Array<{ pageId: string; contentHash: string }>;
    auditId: string;
  }>;
}

export type EditorAiAdmissionRequest = {
  siteId: string;
  requestId: string;
  prompt: string;
};

export type EditorAiAdmissionLease = {
  replay?: EditorAiReplayResult;
  budget?: EditorAiRunBudget;
  attribution?: EditorAiRunnerInput["attribution"];
  settle(
    telemetry: NonNullable<EditorAiRunnerOutput["telemetry"]>,
  ): Promise<"settled" | "released" | "reconcilePending">;
  completeAnswer(input: {
    conversationId?: string;
    summary: string;
    telemetry?: EditorAiRunnerOutput["telemetry"];
  }): Promise<void>;
  fail(
    code: "cancelled" | "run_failed",
    details?: {
      message?: string;
      telemetry?: EditorAiRunnerOutput["telemetry"];
    },
  ): Promise<void>;
};

export interface EditorAiAdmission {
  admit(request: EditorAiAdmissionRequest): Promise<EditorAiAdmissionLease>;
}

export type BaseBlocksApplyChangesetInput = {
  siteId: string;
  conversationId?: string;
  summary: string;
  expectedDraftRevision: number;
  expectedContentHashes: Array<{
    pageId: string;
    contentHash: string | null;
  }>;
  expectedProjectFingerprint: string;
  expectedSiteFingerprint: string;
  nextSiteFingerprint: string;
  nextSiteName: string;
  nextPageOrder: string[];
  pageFingerprints: Array<{
    pageId: string;
    expectedFingerprint: string | null;
    nextFingerprint?: string;
  }>;
  operations: Array<
    | {
        kind: "create";
        clientId: string;
        parentRef?: string | null;
        title: string;
        slug: string;
        icon?: string;
        order: number;
        content: unknown;
      }
    | {
        kind: "update";
        pageId: string;
        parentRef?: string | null;
        title?: string;
        slug?: string;
        icon?: string | null;
        order?: number;
        content?: unknown;
      }
    | { kind: "delete"; pageId: string }
  >;
  defaultPageRef?: string;
  requestId: string;
  telemetry?: EditorAiRunnerOutput["telemetry"];
};

export type EditorAiRunResult = {
  outcome: "answered" | "applied";
  summary: string;
  project: OpenEditorProjectSnapshot;
  changeset: ProjectChangeset;
  diagnostics: readonly unknown[];
  /** The imported agent proposal is never authoritative persisted state. */
  proposalAuthoritative: false;
  applied?: Awaited<ReturnType<EditorAiBackend["applyChangeset"]>>;
  authoritative?: {
    project: OpenEditorProjectSnapshot;
    draftRevision: number;
    pageIdMap: Readonly<Record<string, string>>;
  };
};

export type EditorAiReplayResult = {
  replayed: true;
  outcome: "answered" | "applied";
  summary: string;
  diagnostics: readonly unknown[];
  applied?: Awaited<ReturnType<EditorAiBackend["applyChangeset"]>>;
};

export type EditorAiRunOutcome = EditorAiRunResult | EditorAiReplayResult;
