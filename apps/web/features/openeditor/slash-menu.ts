import {
  HugeiconsIcon,
  type HugeiconsIconProps,
  type IconSvgElement,
} from "@hugeicons/react";
import { createElement } from "react";

/** BaseBlocks product blocks follow OpenEditor's primary writing blocks and Page. */
export const baseBlocksSlashMenuOrder = {
  library: 1210,
  decisionTree: 1220,
  directory: 1230,
  search: 1240,
  quickLinks: 1250,
  tabs: 1260,
} as const;

/** Adapts Hugeicons' icon data to component-based OpenEditor icon slots. */
export function createOpenEditorIcon(icon: IconSvgElement) {
  return function OpenEditorHugeicon(props: Omit<HugeiconsIconProps, "icon">) {
    return createElement(HugeiconsIcon, { ...props, icon });
  };
}
