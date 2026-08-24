// Durable file-extraction job plumbing owned by BaseBlocks.
// Ported from the former @baseblocks/anydoc-convex package: Workpool owns
// scheduling, concurrency, retry state, cancellation, and status; this module
// adds idempotent binding of work IDs to extraction rows and structured
// failure encoding across the Workpool result channel.

import {
  Workpool,
  type OnCompleteArgs,
  type RetryBehavior,
  type WorkId,
  type WorkpoolComponent,
  type WorkpoolOptions,
} from "@convex-dev/workpool";
import type {
  DefaultFunctionArgs,
  FunctionReference,
  FunctionVisibility,
} from "convex/server";

export type WorkpoolMutationContext = Parameters<Workpool["enqueueAction"]>[0];
export type WorkpoolQueryContext = Parameters<Workpool["status"]>[0];

export interface ConvexIngestionJob<Source = unknown, Metadata = unknown>
  extends DefaultFunctionArgs {
  readonly entityId: string;
  readonly sourceVersion: string;
  /** Monotonically increases whenever source or cancellation state changes. */
  readonly generation: number;
  readonly idempotencyKey: string;
  readonly source: Source;
  readonly metadata?: Metadata;
  readonly format?: string;
  readonly filename?: string;
  readonly contentType?: string;
  readonly expectedSize?: number;
  readonly expectedSha256?: string;
  readonly maxBytes?: number;
  /** Maximum wall time for each Workpool attempt. A fresh deadline is created on every retry. */
  readonly attemptTimeoutMs?: number;
}

export interface ConvexIngestionReceipt {
  readonly entityId: string;
  readonly sourceVersion: string;
  readonly generation: number;
  readonly idempotencyKey: string;
  readonly workId: WorkId;
}

export interface DurableIngestionBinding<
  Args extends ConvexIngestionJob,
  MutationContext extends WorkpoolMutationContext = WorkpoolMutationContext,
  QueryContext extends WorkpoolQueryContext = WorkpoolQueryContext,
  State = unknown,
> {
  /** Atomically keep the first workId for this idempotency key/generation and return the winner. */
  bind(ctx: MutationContext, job: Args, candidate: WorkId): Promise<WorkId>;
  /** Atomically invalidate the generation before returning true. */
  cancel(
    ctx: MutationContext,
    receipt: ConvexIngestionReceipt,
  ): Promise<boolean>;
  status(ctx: QueryContext, receipt: ConvexIngestionReceipt): Promise<State>;
}

export interface ConvexIngestionQueueOptions<
  Args extends ConvexIngestionJob,
  MutationContext extends WorkpoolMutationContext = WorkpoolMutationContext,
  QueryContext extends WorkpoolQueryContext = WorkpoolQueryContext,
  BindingState = unknown,
> extends WorkpoolOptions {
  /** Retries are safe only when the result writer is idempotent by idempotencyKey. */
  readonly retry?: boolean | RetryBehavior;
  readonly binding: DurableIngestionBinding<
    Args,
    MutationContext,
    QueryContext,
    BindingState
  >;
  readonly onComplete?: FunctionReference<
    "mutation",
    FunctionVisibility,
    OnCompleteArgs
  >;
  readonly completionContext?: (job: Args) => unknown;
}

export class ConvexIngestionQueue<
  Args extends ConvexIngestionJob,
  ReturnValue = unknown,
  MutationContext extends WorkpoolMutationContext = WorkpoolMutationContext,
  QueryContext extends WorkpoolQueryContext = WorkpoolQueryContext,
  BindingState = unknown,
> {
  readonly #action: FunctionReference<
    "action",
    FunctionVisibility,
    Args,
    ReturnValue
  >;
  readonly #pool: Workpool;
  readonly #retry: boolean | RetryBehavior;
  readonly #binding: DurableIngestionBinding<
    Args,
    MutationContext,
    QueryContext,
    BindingState
  >;
  readonly #onComplete:
    | FunctionReference<"mutation", FunctionVisibility, OnCompleteArgs>
    | undefined;
  readonly #completionContext: ((job: Args) => unknown) | undefined;

  constructor(
    component: WorkpoolComponent,
    action: FunctionReference<"action", FunctionVisibility, Args, ReturnValue>,
    options: ConvexIngestionQueueOptions<
      Args,
      MutationContext,
      QueryContext,
      BindingState
    >,
  ) {
    const {
      binding,
      completionContext,
      onComplete,
      retry = true,
      ...poolOptions
    } = options;
    this.#action = action;
    this.#retry = retry;
    this.#binding = binding;
    this.#onComplete = onComplete;
    this.#completionContext = completionContext;
    this.#pool = new Workpool(component, {
      defaultRetryBehavior: {
        base: 2,
        initialBackoffMs: 1_000,
        maxAttempts: 4,
      },
      maxParallelism: 4,
      ...poolOptions,
      retryActionsByDefault: false,
    });
  }

  async enqueue(
    ctx: MutationContext,
    job: Args,
  ): Promise<ConvexIngestionReceipt> {
    if (!job.idempotencyKey || job.idempotencyKey.length > 512) {
      throw new Error(
        "AnyDoc Convex jobs require an idempotencyKey of at most 512 characters.",
      );
    }
    if (
      !Number.isSafeInteger(job.generation) ||
      job.generation < 0 ||
      !job.entityId ||
      !job.sourceVersion
    ) {
      throw new Error(
        "AnyDoc Convex jobs require entityId, sourceVersion, and a non-negative generation.",
      );
    }
    if (
      job.attemptTimeoutMs !== undefined &&
      (!Number.isSafeInteger(job.attemptTimeoutMs) || job.attemptTimeoutMs <= 0)
    ) {
      throw new Error(
        "attemptTimeoutMs must be a positive integer when provided.",
      );
    }
    const candidate = await this.#pool.enqueueAction(ctx, this.#action, job, {
      name: "anydoc:ingest",
      retry: this.#retry,
      ...(this.#onComplete
        ? {
            onComplete: this.#onComplete,
            context: this.#completionContext?.(job),
          }
        : {}),
    });
    let workId: WorkId;
    try {
      workId = await this.#binding.bind(ctx, job, candidate);
    } catch (cause) {
      // Enqueue happens before the application can atomically bind its workId.
      // Best-effort cancellation prevents an unbound candidate from becoming
      // an invisible orphan; the binding error remains authoritative.
      await this.#pool.cancel(ctx, candidate).catch(() => undefined);
      throw cause;
    }
    if (workId !== candidate) await this.#pool.cancel(ctx, candidate);
    return {
      entityId: job.entityId,
      generation: job.generation,
      idempotencyKey: job.idempotencyKey,
      sourceVersion: job.sourceVersion,
      workId,
    };
  }

  async cancel(
    ctx: MutationContext,
    receipt: ConvexIngestionReceipt,
  ): Promise<boolean> {
    const cancelled = await this.#binding.cancel(ctx, receipt);
    if (cancelled) await this.#pool.cancel(ctx, receipt.workId);
    return cancelled;
  }

  async status(ctx: QueryContext, receipt: ConvexIngestionReceipt) {
    const [workpool, binding] = await Promise.all([
      this.#pool.status(ctx, receipt.workId),
      this.#binding.status(ctx, receipt),
    ]);
    return { binding, workpool };
  }
}

const FAILURE_MARKER = "ANYDOC_FAILURE_V1:";
const MAX_FAILURE_MESSAGE_CHARACTERS = 2_048;
const MAX_FAILURE_FIELD_CHARACTERS = 128;
const LIMIT_KEYS = new Set([
  "actualBytes",
  "actualSize",
  "expectedSize",
  "limit",
  "maxBytes",
  "maxCells",
  "maxDocumentBytes",
  "maxPages",
  "maxSlides",
  "maxTextBytes",
  "maximum",
]);

export interface ConvexIngestionFailure {
  readonly version: 1;
  readonly kind: "anydoc-ingestion-failure";
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly format?: string;
  readonly status?: number;
  readonly limits?: Readonly<Record<string, number | string>>;
}

function field(cause: unknown, name: string): unknown {
  return cause && typeof cause === "object" && name in cause
    ? (cause as Record<string, unknown>)[name]
    : undefined;
}

function boundedString(value: string, maximum: number): string {
  return Array.from(value).slice(0, maximum).join("");
}

function collectLimits(
  cause: unknown,
): Record<string, number | string> | undefined {
  const limits: Record<string, number | string> = {};
  let current = cause;
  for (
    let depth = 0;
    depth < 4 && current && typeof current === "object";
    depth += 1
  ) {
    for (const key of LIMIT_KEYS) {
      const value = field(current, key);
      if (
        (typeof value === "number" && Number.isFinite(value)) ||
        typeof value === "string"
      ) {
        limits[key] ??=
          typeof value === "string"
            ? boundedString(value, MAX_FAILURE_FIELD_CHARACTERS)
            : value;
      }
    }
    current = field(current, "cause");
  }
  return Object.keys(limits).length === 0 ? undefined : limits;
}

/** Encodes a failure into the Workpool string channel without losing stable machine fields. */
export function encodeConvexIngestionFailure(cause: unknown): string {
  const code = field(cause, "code");
  const retryable = field(cause, "retryable");
  const format = field(cause, "format");
  const status = field(cause, "status");
  const limits = collectLimits(cause);
  const failure: ConvexIngestionFailure = {
    version: 1,
    kind: "anydoc-ingestion-failure",
    code:
      typeof code === "string"
        ? boundedString(code, MAX_FAILURE_FIELD_CHARACTERS)
        : "processing-failed",
    message: boundedString(
      cause instanceof Error ? cause.message : "AnyDoc ingestion failed.",
      MAX_FAILURE_MESSAGE_CHARACTERS,
    ),
    retryable: retryable === true,
    ...(typeof format === "string"
      ? { format: boundedString(format, MAX_FAILURE_FIELD_CHARACTERS) }
      : {}),
    ...(typeof status === "number" && Number.isFinite(status)
      ? { status }
      : {}),
    ...(limits ? { limits } : {}),
  };
  return `${FAILURE_MARKER}${encodeURIComponent(JSON.stringify(failure))}`;
}

/** Accepts either Workpool's complete result or its error string. */
export function decodeConvexIngestionFailure(
  value: OnCompleteArgs["result"] | string | unknown,
): ConvexIngestionFailure | undefined {
  const text =
    typeof value === "string"
      ? value
      : value &&
          typeof value === "object" &&
          "kind" in value &&
          value.kind === "failed" &&
          "error" in value
        ? String(value.error)
        : undefined;
  if (!text) return undefined;
  const start = text.indexOf(FAILURE_MARKER);
  if (start < 0) return undefined;
  const encoded = text
    .slice(start + FAILURE_MARKER.length)
    .match(/^[A-Za-z0-9%_.!~*'()-]+/)?.[0];
  if (!encoded) return undefined;
  try {
    const parsed = JSON.parse(
      decodeURIComponent(encoded),
    ) as Partial<ConvexIngestionFailure>;
    if (
      parsed.version !== 1 ||
      parsed.kind !== "anydoc-ingestion-failure" ||
      typeof parsed.code !== "string" ||
      Array.from(parsed.code).length > MAX_FAILURE_FIELD_CHARACTERS ||
      typeof parsed.message !== "string" ||
      Array.from(parsed.message).length > MAX_FAILURE_MESSAGE_CHARACTERS ||
      typeof parsed.retryable !== "boolean" ||
      (parsed.format !== undefined &&
        (typeof parsed.format !== "string" ||
          Array.from(parsed.format).length > MAX_FAILURE_FIELD_CHARACTERS)) ||
      (parsed.status !== undefined &&
        (typeof parsed.status !== "number" ||
          !Number.isFinite(parsed.status))) ||
      (parsed.limits !== undefined &&
        (!parsed.limits ||
          typeof parsed.limits !== "object" ||
          Array.isArray(parsed.limits) ||
          Object.keys(parsed.limits).length > LIMIT_KEYS.size ||
          Object.entries(parsed.limits).some(
            ([key, item]) =>
              !LIMIT_KEYS.has(key) ||
              !(
                (typeof item === "number" && Number.isFinite(item)) ||
                (typeof item === "string" &&
                  Array.from(item).length <= MAX_FAILURE_FIELD_CHARACTERS)
              ),
          )))
    ) {
      return undefined;
    }
    return parsed as ConvexIngestionFailure;
  } catch {
    return undefined;
  }
}
