import type {
  AnyContent,
  ContentFor,
  ElementType,
} from "@baseblocks/domain/elements";
import type { ComponentType } from "react";

export interface ElementRendererProps<T extends ElementType = ElementType> {
  id: string;
  type: T;
  content: ContentFor<T>;
}

class RuntimeElementRegistry {
  private renderers = new Map<
    ElementType,
    ComponentType<ElementRendererProps<ElementType>>
  >();

  registerRenderer<T extends ElementType>(
    type: T,
    renderer: ComponentType<ElementRendererProps<T>>,
  ): void {
    this.renderers.set(
      type,
      renderer as unknown as ComponentType<ElementRendererProps<ElementType>>,
    );
  }

  getRenderer<T extends ElementType>(
    type: T,
  ): ComponentType<ElementRendererProps<T>> | undefined {
    return this.renderers.get(type) as
      | ComponentType<ElementRendererProps<T>>
      | undefined;
  }
}

const runtimeRegistry = new RuntimeElementRegistry();

export const registerElementRenderer = <T extends ElementType>(
  type: T,
  renderer: ComponentType<ElementRendererProps<T>>,
) => runtimeRegistry.registerRenderer(type, renderer);

export const getElementRenderer = <T extends ElementType>(type: T) =>
  runtimeRegistry.getRenderer(type);

export interface ElementRendererWrapperProps {
  id: string;
  type: ElementType;
  content: AnyContent;
}
