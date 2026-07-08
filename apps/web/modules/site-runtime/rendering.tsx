"use client";

import type {
  AnyContent,
  ContentFor,
  ElementType,
} from "@baseblocks/domain/elements";
import type { ComponentType } from "react";
import { createElement } from "react";
import {
  HeadingRenderer,
  ParagraphRenderer,
  CalloutRenderer,
  DividerRenderer,
  SpacerRenderer,
} from "@/modules/site-elements/blocks/basic-renderers";
import { CodeRenderer } from "@/modules/site-elements/blocks/code-renderer";
import { DecisionTreeRenderer } from "@/modules/site-elements/blocks/decision-tree/renderer";
import { DirectoryRenderer } from "@/modules/site-elements/blocks/directory/renderer";
import { FileRenderer } from "@/modules/site-elements/blocks/file-renderer";
import { FlowchartRenderer } from "@/modules/site-elements/blocks/flowchart/renderer";
import { PageRenderer } from "@/modules/site-elements/blocks/page-renderer";
import { RichTextRenderer } from "@/modules/site-elements/blocks/richtext-renderer";
import { ImageRenderer } from "@/modules/site-elements/media/image/renderer";
import { LibraryRenderer } from "@/modules/site-elements/sections/library/renderer";
import { QuicklinksRenderer } from "@/modules/site-elements/sections/quicklinks/renderer";
import { SearchRenderer } from "@/modules/site-elements/sections/search/renderer";

export interface ElementRendererProps<T extends ElementType = ElementType> {
  id: string;
  type: T;
  content: ContentFor<T>;
}

interface ElementRendererWrapperProps {
  id: string;
  type: ElementType;
  content: AnyContent;
}

const ELEMENT_RENDERERS: Partial<
  Record<ElementType, ComponentType<ElementRendererProps<ElementType>>>
> = {
  heading: HeadingRenderer as ComponentType<ElementRendererProps<ElementType>>,
  paragraph: ParagraphRenderer as ComponentType<
    ElementRendererProps<ElementType>
  >,
  callout: CalloutRenderer as ComponentType<ElementRendererProps<ElementType>>,
  divider: DividerRenderer as ComponentType<ElementRendererProps<ElementType>>,
  "block-spacer": SpacerRenderer as ComponentType<
    ElementRendererProps<ElementType>
  >,
  code: CodeRenderer as ComponentType<ElementRendererProps<ElementType>>,
  richtext: RichTextRenderer as ComponentType<
    ElementRendererProps<ElementType>
  >,
  file: FileRenderer as ComponentType<ElementRendererProps<ElementType>>,
  page: PageRenderer as ComponentType<ElementRendererProps<ElementType>>,
  directory: DirectoryRenderer as ComponentType<
    ElementRendererProps<ElementType>
  >,
  flowchart: FlowchartRenderer as ComponentType<
    ElementRendererProps<ElementType>
  >,
  "decision-tree": DecisionTreeRenderer as ComponentType<
    ElementRendererProps<ElementType>
  >,
  image: ImageRenderer as ComponentType<ElementRendererProps<ElementType>>,
  search: SearchRenderer as ComponentType<ElementRendererProps<ElementType>>,
  library: LibraryRenderer as ComponentType<ElementRendererProps<ElementType>>,
  quicklinks: QuicklinksRenderer as ComponentType<
    ElementRendererProps<ElementType>
  >,
};

export function ElementRenderer({
  id,
  type,
  content,
}: ElementRendererWrapperProps) {
  const Renderer = ELEMENT_RENDERERS[type];

  if (!Renderer) {
    return null;
  }

  return createElement(Renderer, { id, type, content });
}
