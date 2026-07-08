import { getDefaultContent } from "@/modules/site-elements/authoring/registry";
import type {
  ElementPageBlock,
  ElementType,
  PageBlock,
  PageBlockType,
} from "@baseblocks/domain";
import { nanoid } from "nanoid";

export function generateBlockId() {
  return nanoid(10);
}

export function createPageBlock(type: PageBlockType): PageBlock | null {
  if (type === "single") {
    return {
      id: generateBlockId(),
      type: "single",
      blocks: [],
    };
  }

  if (type === "rows") {
    return {
      id: generateBlockId(),
      type: "rows",
      rows: [
        { id: generateBlockId(), blocks: [] },
        { id: generateBlockId(), blocks: [] },
      ],
    };
  }

  if (type === "columns") {
    return {
      id: generateBlockId(),
      type: "columns",
      columns: [
        { id: generateBlockId(), blocks: [] },
        { id: generateBlockId(), blocks: [] },
      ],
    };
  }

  if (type === "grid") {
    return {
      id: generateBlockId(),
      type: "grid",
      columns: 2,
      cells: [
        { id: generateBlockId(), blocks: [] },
        { id: generateBlockId(), blocks: [] },
        { id: generateBlockId(), blocks: [] },
        { id: generateBlockId(), blocks: [] },
      ],
    };
  }

  if (type === "sidebar") {
    return {
      id: generateBlockId(),
      type: "sidebar",
      side: "right",
      main: { id: generateBlockId(), blocks: [] },
      aside: { id: generateBlockId(), blocks: [] },
    };
  }

  if (type === "tabs") {
    return {
      id: generateBlockId(),
      type: "tabs",
      tabs: [
        { id: generateBlockId(), label: "Tab 1", blocks: [] },
        { id: generateBlockId(), label: "Tab 2", blocks: [] },
      ],
    };
  }

  if (type === "spacer") {
    return {
      id: generateBlockId(),
      type: "spacer",
      size: "medium",
    };
  }

  const content = getDefaultContent(type as ElementType);
  if (!content) return null;

  return {
    id: generateBlockId(),
    type,
    content,
  } as ElementPageBlock;
}
