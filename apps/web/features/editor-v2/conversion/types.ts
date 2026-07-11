import type { OpenEditorDocument } from "@openeditor/core";
import type { ElementType } from "@baseblocks/domain";

export type ConversionSeverity = "info" | "warning";

export interface ConversionWarning {
  code:
    | "unsupported-block"
    | "flattened-tabs"
    | "aside-layout"
    | "image-caption"
    | "empty-page";
  message: string;
  severity: ConversionSeverity;
  blockId?: string;
  blockType?: ElementType;
}

export interface ConversionResult {
  document: OpenEditorDocument;
  warnings: ConversionWarning[];
  sourceBlockCount: number;
  convertedBlockCount: number;
  placeholderCount: number;
}
