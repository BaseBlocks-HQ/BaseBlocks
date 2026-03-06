import { getElementRenderer } from "@/modules/elements/framework/registry";
import type { AnyContent, ElementType } from "@baseblocks/types/elements";
import { createElement } from "react";

interface ElementRendererWrapperProps {
  id: string;
  type: ElementType;
  content: AnyContent;
}

/**
 * Dynamic element renderer that renders the appropriate renderer based on element type
 * This is the new unified wrapper for all element types
 */
export function ElementRendererWrapper({
  id,
  type,
  content,
}: ElementRendererWrapperProps) {
  const Renderer = getElementRenderer(type);

  if (!Renderer) {
    return null;
  }

  return createElement(Renderer, { id, type, content });
}
