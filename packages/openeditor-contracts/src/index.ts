import {
  type createDocument,
  validateDocument,
  type ProseMirrorNode,
} from "@openeditor/core";
import { validateOpenEditorEngineDocument } from "@openeditor/embedded-runtime";
import { defaultDocumentContract } from "@openeditor/extensions";

export * from "./page-projection";
export * from "./custom-block-migration";

export const BASEBLOCKS_OPENEDITOR_SCHEMA_VERSION =
  "baseblocks.openeditor.custom-block.v1";

/** BaseBlocks adds product behavior through the one generic customBlock node. */
export const baseBlocksDocumentContract = defaultDocumentContract;

export const validateBaseBlocksDocument = (document: unknown) =>
  validateDocument(document, {
    contract: baseBlocksDocumentContract,
    limits: { requireNodeIds: true },
  });

export const assertBaseBlocksDocument = (document: unknown): void => {
  const validation = validateBaseBlocksDocument(document);
  if (!validation.valid) {
    throw new Error(
      validation.issues
        .slice(0, 20)
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("\n"),
    );
  }
  const tiptapValidation = validateOpenEditorEngineDocument(
    document as ReturnType<typeof createDocument>,
  );
  if (!tiptapValidation.valid) {
    throw new Error(
      tiptapValidation.diagnostics
        .map((diagnostic) => `${diagnostic.path}: ${diagnostic.message}`)
        .join("\n"),
    );
  }
};

export type BaseBlocksCustomNode = ProseMirrorNode & { type: "customBlock" };
