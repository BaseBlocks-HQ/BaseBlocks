"use client";

import type { AnyContent, ElementType } from "@baseblocks/domain/elements";
import { createElement } from "react";
import { getElementRenderer } from "./registry";

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

  return createElement(Renderer, { id, type, content });
}
