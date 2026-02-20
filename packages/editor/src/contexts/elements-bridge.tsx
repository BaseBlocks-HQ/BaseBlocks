"use client";

import type { Id } from "@baseblocks/backend";
import type {
  AnyContent,
  ElementType,
  LayoutType,
  SaveStatus,
} from "@baseblocks/types";
import type { LucideIcon } from "lucide-react";
import {
  type ComponentType,
  type ReactNode,
  createContext,
  useContext,
} from "react";

// Props that the element editor wrapper component expects
export interface ElementWrapperProps {
  id: string;
  type: ElementType;
  content: AnyContent;
  isSelected?: boolean;
  onUpdate: (content: AnyContent) => Promise<unknown> | void;
  onRemove?: () => Promise<unknown> | void;
  onSaveStatusChange?: (status: SaveStatus) => void;
}

// Props that the layout context provider component expects
export interface LayoutContextProviderProps {
  children: ReactNode;
  layoutType: LayoutType;
  layoutId?: string;
  slotPosition?: number;
}

// Registry entry shape exposed through the bridge
export interface ElementRegistryEntry {
  type: string;
  label: string;
  description: string;
  icon: LucideIcon;
  keywords?: string[];
  preview?: ComponentType<{ className?: string }>;
}

// Config panel props
export interface ConfigPanelProps {
  content: AnyContent;
  onUpdate: (content: AnyContent) => Promise<unknown> | void;
}

// The bridge interface that apps/web injects into the editor package
export interface EditorElementsBridge {
  ElementWrapper: ComponentType<ElementWrapperProps>;
  LayoutContextProvider: ComponentType<LayoutContextProviderProps>;
  getConfigPanel: (type: string) => ComponentType<ConfigPanelProps> | null;
  hasConfigPanel: (type: string) => boolean;
  getElementsByCategory: (category: string) => ElementRegistryEntry[];
  categoryIcons: Record<string, ReactNode>;
  panels: {
    customization: ComponentType<{ siteId: Id<"sites"> }>;
    navigation: ComponentType<{ siteId: Id<"sites"> }>;
    site: ComponentType<{ siteId: Id<"sites"> }>;
  };
}

const EditorElementsBridgeContext = createContext<EditorElementsBridge | null>(
  null,
);

interface EditorElementsBridgeProviderProps {
  bridge: EditorElementsBridge;
  children: ReactNode;
}

export function EditorElementsBridgeProvider({
  bridge,
  children,
}: EditorElementsBridgeProviderProps) {
  return (
    <EditorElementsBridgeContext.Provider value={bridge}>
      {children}
    </EditorElementsBridgeContext.Provider>
  );
}

export function useEditorElements(): EditorElementsBridge {
  const context = useContext(EditorElementsBridgeContext);
  if (!context) {
    throw new Error(
      "useEditorElements must be used within an EditorElementsBridgeProvider",
    );
  }
  return context;
}
