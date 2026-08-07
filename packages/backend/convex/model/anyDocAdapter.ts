"use node";

export type AnyDocErrorCode =
  | "unsupported"
  | "malformed"
  | "encrypted"
  | "resourceLimit"
  | "missingPart"
  | "io";

export type AnyDocFormat =
  | "doc"
  | "docx"
  | "odt"
  | "pdf"
  | "ppt"
  | "pptx"
  | "rtf"
  | "epub"
  | "xlsx"
  | "ods"
  | "odp"
  | "csv";

type AnyDocNodeModule = {
  formatFromExtension(extension: string): AnyDocFormat | null;
  toMarkdownBytes(
    bytes: Uint8Array,
    format?: AnyDocFormat | null,
  ): Promise<string>;
};

export class AnyDocIntegrationError extends Error {
  readonly code = "integration_unavailable";
}

export function errorCauses(error: unknown): unknown[] {
  const causes: unknown[] = [];
  let current = error;
  for (let depth = 0; current !== undefined && depth < 8; depth += 1) {
    causes.push(current);
    current =
      current && typeof current === "object" && "cause" in current
        ? (current as { cause?: unknown }).cause
        : undefined;
  }
  return causes;
}

export function safeErrorMessage(error: unknown): string {
  const errors = errorCauses(error).filter(
    (cause): cause is Error => cause instanceof Error,
  );
  return (errors.at(-1)?.message ?? String(error))
    .replaceAll(/[\r\n\t]+/gu, " ")
    .slice(0, 500);
}

export function mapAnyDocIngestionFailure(
  error: unknown,
  limits: { maxInputBytes: number; maxOutputBytes: number },
): {
  code: string;
  message: string;
  retryable: boolean;
  limit?: number;
} {
  const causes = errorCauses(error);
  const codes = new Set(
    causes.flatMap((cause) =>
      cause &&
      typeof cause === "object" &&
      "code" in cause &&
      typeof cause.code === "string"
        ? [cause.code]
        : [],
    ),
  );
  const message = safeErrorMessage(error);
  if (
    causes.some((cause) => cause instanceof AnyDocIntegrationError) ||
    codes.has("unsupported-runtime")
  ) {
    return { code: "integration_unavailable", message, retryable: false };
  }
  const parserCode = [...codes].find((code) =>
    [
      "unsupported",
      "malformed",
      "encrypted",
      "resourceLimit",
      "missingPart",
      "io",
    ].includes(code),
  );
  if (parserCode) {
    return {
      code:
        parserCode === "resourceLimit"
          ? "resource_limit"
          : parserCode === "missingPart"
            ? "missing_part"
            : parserCode,
      message,
      retryable: parserCode === "io",
    };
  }
  if (codes.has("deadline-exceeded") || codes.has("aborted")) {
    return {
      code: "execution_deadline",
      message: "Extraction exceeded its bounded execution deadline",
      retryable: true,
    };
  }
  if (codes.has("too-large")) {
    return {
      code: "input_too_large",
      message,
      retryable: false,
      limit: limits.maxInputBytes,
    };
  }
  if (codes.has("integrity-failed") || codes.has("source-changed")) {
    return { code: "source_mismatch", message, retryable: false };
  }
  if (codes.has("output-too-large")) {
    return {
      code: "output_too_large",
      message,
      retryable: false,
      limit: limits.maxOutputBytes,
    };
  }
  if (codes.has("invalid-source")) {
    return { code: "invalid_source", message, retryable: false };
  }
  if (codes.has("fetch-failed")) {
    return { code: "storage_error", message, retryable: true };
  }
  const explicitRetry = causes.find(
    (cause) => cause && typeof cause === "object" && "retryable" in cause,
  ) as { retryable?: unknown } | undefined;
  return {
    code: "extraction_error",
    message,
    retryable:
      typeof explicitRetry?.retryable === "boolean"
        ? explicitRetry.retryable
        : !codes.has("processing-failed"),
  };
}

/**
 * Narrow adapter for the AnyDoc Node API. Keep this import literal: Convex's
 * bundler discovers configured external packages from literal module imports.
 * Once the backend dependency uses a registry version, convex.json installs
 * the umbrella package and its platform binary in the Node runtime.
 */
export async function loadAnyDocNode(): Promise<AnyDocNodeModule> {
  let loaded: unknown;
  try {
    loaded = await import("@baseblocks/anydoc/node");
  } catch {
    throw new AnyDocIntegrationError(
      "AnyDoc Node extraction is unavailable; install @baseblocks/anydoc in @baseblocks/backend",
    );
  }
  if (
    !loaded ||
    typeof loaded !== "object" ||
    !("formatFromExtension" in loaded) ||
    typeof loaded.formatFromExtension !== "function" ||
    !("toMarkdownBytes" in loaded) ||
    typeof loaded.toMarkdownBytes !== "function"
  ) {
    throw new AnyDocIntegrationError(
      "@baseblocks/anydoc/node does not expose the expected Node API",
    );
  }
  return loaded as AnyDocNodeModule;
}
