"use client";

import { getElementRenderer } from "@/components/site-elements/registry";
import type { ElementRendererProps } from "@/components/site-elements/registry";
import type { AnyContent, ElementType } from "@baseblocks/domain/elements";
import { createElement } from "react";

export type { ElementRendererProps } from "@/components/site-elements/registry";

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
