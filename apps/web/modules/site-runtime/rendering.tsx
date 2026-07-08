"use client";

import { getElementRenderer } from "@/modules/site-elements/manifest";
import type { ElementRendererProps } from "@/modules/site-elements/types";
import type { AnyContent, ElementType } from "@baseblocks/domain/elements";
import { createElement } from "react";

export type { ElementRendererProps } from "@/modules/site-elements/types";

interface ElementRendererWrapperProps {
  id: string;
  type: ElementType;
  content: AnyContent;
}

export function ElementRenderer({
  id,
  type,
  content,
}: ElementRendererWrapperProps) {
  const Renderer = getElementRenderer(type);

  if (!Renderer) {
    return null;
  }

  return createElement(Renderer, { id, type, content } as ElementRendererProps);
}
