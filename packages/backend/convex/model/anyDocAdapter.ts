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
