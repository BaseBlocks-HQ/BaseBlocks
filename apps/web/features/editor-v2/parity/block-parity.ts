import type { ElementType } from "@baseblocks/domain";

export type ParityStatus = "converted" | "partial" | "pending";

export interface BlockParityRow {
  legacyType: ElementType;
  target: string;
  status: ParityStatus;
  note: string;
}

export const blockParity: readonly BlockParityRow[] = [
  {
    legacyType: "paragraph",
    target: "Paragraph",
    status: "converted",
    note: "Direct conversion",
  },
  {
    legacyType: "heading",
    target: "Heading",
    status: "converted",
    note: "Levels 1–5 preserved",
  },
  {
    legacyType: "code",
    target: "Code Block",
    status: "converted",
    note: "Text and language preserved",
  },
  {
    legacyType: "divider",
    target: "Divider",
    status: "converted",
    note: "Direct conversion",
  },
  {
    legacyType: "image",
    target: "Image",
    status: "partial",
    note: "Caption still pending",
  },
  {
    legacyType: "richtext",
    target: "Native Open Editor document nodes",
    status: "partial",
    note: "Legacy wrapper eliminated; supported BlockNote content is flattened in place",
  },
  {
    legacyType: "callout",
    target: "Callout",
    status: "pending",
    note: "Awaiting generic or local extension",
  },
  {
    legacyType: "spacer",
    target: "Layout spacing",
    status: "pending",
    note: "Migration semantics undecided",
  },
  {
    legacyType: "file",
    target: "Attachment",
    status: "pending",
    note: "Awaiting attachment support",
  },
  {
    legacyType: "page",
    target: "Page reference",
    status: "pending",
    note: "Requires page resolver",
  },
  {
    legacyType: "directory",
    target: "Directory extension",
    status: "pending",
    note: "Base Blocks-owned block",
  },
  {
    legacyType: "flowchart",
    target: "Mermaid",
    status: "pending",
    note: "Awaiting Mermaid support",
  },
  {
    legacyType: "decision-tree",
    target: "Decision Tree extension",
    status: "pending",
    note: "Base Blocks-owned block",
  },
  {
    legacyType: "search",
    target: "Search extension",
    status: "pending",
    note: "Requires site search runtime",
  },
  {
    legacyType: "library",
    target: "Library extension",
    status: "pending",
    note: "Requires document runtime",
  },
  {
    legacyType: "quicklinks",
    target: "Quick Links extension",
    status: "converted",
    note: "Consumer extension with editing, viewing, and export",
  },
] as const;
