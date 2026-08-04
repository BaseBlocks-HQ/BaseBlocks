export type AiRunEntitlement = {
  enabled: boolean;
  dailyRunLimit: number;
  maxActorConcurrency: number;
  maxSiteConcurrency: number;
  maxOrganizationConcurrency: number;
  maxRequestsPerRun: number;
  maxInputTokensPerRun: number;
  maxOutputTokensPerRun: number;
  maxSpendUsdPerRun: number;
};

export type AiRunPolicy = Omit<AiRunEntitlement, "enabled">;

export type AiRunLease = {
  status: "running" | "completed" | "failed";
  leaseExpiresAt: number;
};

export type AiRunTerminalStatus = Exclude<AiRunLease["status"], "running">;

const HARD_MAX_DAILY_RUNS = 10_000;
const HARD_MAX_CONCURRENCY = 20;
const HARD_MAX_REQUESTS_PER_RUN = 100;
const HARD_MAX_INPUT_TOKENS_PER_RUN = 2_000_000;
const HARD_MAX_OUTPUT_TOKENS_PER_RUN = 500_000;
const HARD_MAX_SPEND_USD_PER_RUN = 100;

function boundedPositiveInteger(value: number, maximum: number, field: string) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${field} must be an integer between 1 and ${maximum}`);
  }
  return value;
}

export function resolveAiRunPolicy(
  entitlement: AiRunEntitlement | null | undefined,
): AiRunPolicy {
  if (!entitlement?.enabled) {
    throw new Error("Editor AI is not enabled for this organization");
  }
  return {
    dailyRunLimit: boundedPositiveInteger(
      entitlement.dailyRunLimit,
      HARD_MAX_DAILY_RUNS,
      "dailyRunLimit",
    ),
    maxActorConcurrency: boundedPositiveInteger(
      entitlement.maxActorConcurrency,
      HARD_MAX_CONCURRENCY,
      "maxActorConcurrency",
    ),
    maxSiteConcurrency: boundedPositiveInteger(
      entitlement.maxSiteConcurrency,
      HARD_MAX_CONCURRENCY,
      "maxSiteConcurrency",
    ),
    maxOrganizationConcurrency: boundedPositiveInteger(
      entitlement.maxOrganizationConcurrency,
      HARD_MAX_CONCURRENCY,
      "maxOrganizationConcurrency",
    ),
    maxRequestsPerRun: boundedPositiveInteger(
      entitlement.maxRequestsPerRun,
      HARD_MAX_REQUESTS_PER_RUN,
      "maxRequestsPerRun",
    ),
    maxInputTokensPerRun: boundedPositiveInteger(
      entitlement.maxInputTokensPerRun,
      HARD_MAX_INPUT_TOKENS_PER_RUN,
      "maxInputTokensPerRun",
    ),
    maxOutputTokensPerRun: boundedPositiveInteger(
      entitlement.maxOutputTokensPerRun,
      HARD_MAX_OUTPUT_TOKENS_PER_RUN,
      "maxOutputTokensPerRun",
    ),
    maxSpendUsdPerRun:
      Number.isFinite(entitlement.maxSpendUsdPerRun) &&
      entitlement.maxSpendUsdPerRun > 0 &&
      entitlement.maxSpendUsdPerRun <= HARD_MAX_SPEND_USD_PER_RUN
        ? entitlement.maxSpendUsdPerRun
        : (() => {
            throw new Error(
              `maxSpendUsdPerRun must be greater than 0 and at most ${HARD_MAX_SPEND_USD_PER_RUN}`,
            );
          })(),
  };
}

/**
 * A run may write application state only while it owns a live running lease.
 * This deliberately treats the exact expiration instant as expired.
 */
export function assertActiveAiRunLease(run: AiRunLease, now: number) {
  if (run.status !== "running") {
    throw new Error(`Editor AI run is already ${run.status}`);
  }
  if (!Number.isFinite(run.leaseExpiresAt) || run.leaseExpiresAt <= now) {
    throw new Error("Editor AI run lease has expired");
  }
}

export function assertAiRunTransition(
  run: AiRunLease,
  nextStatus: AiRunTerminalStatus,
  now: number,
) {
  assertActiveAiRunLease(run, now);
  if (nextStatus !== "completed" && nextStatus !== "failed") {
    throw new Error("Invalid Editor AI run transition");
  }
}

export function assertAiRunCapacity(input: {
  policy: AiRunPolicy;
  actorActive: number;
  siteActive: number;
  organizationActive: number;
  recentRuns: number;
}) {
  if (input.actorActive >= input.policy.maxActorConcurrency)
    throw new Error("Actor Editor AI concurrency limit reached");
  if (input.siteActive >= input.policy.maxSiteConcurrency)
    throw new Error("Site Editor AI concurrency limit reached");
  if (input.organizationActive >= input.policy.maxOrganizationConcurrency)
    throw new Error("Organization Editor AI concurrency limit reached");
  if (input.recentRuns >= input.policy.dailyRunLimit)
    throw new Error("Organization Editor AI daily quota reached");
}
