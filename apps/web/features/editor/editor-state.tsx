"use client";

import {
  getDefaultBlockPickerItems,
  type OpenEditorBlockPickerItem,
  type OpenEditorController,
} from "@openeditor/react";
import {
  type ReactNode,
  createContext,
  use,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";

interface EditorPermissions {
  canEdit: boolean;
  isAdmin: boolean;
  isLoading: boolean;
}

interface EditorUiContextValue {
  canGoBack: boolean;
  goBack: () => void;
  openPage: (pageId: string) => void;
  resetPageHistory: () => void;
}

interface EditorSiteContextValue {
  siteId: string;
  canEdit: boolean;
  isAdmin: boolean;
  isPermissionsLoading: boolean;
}

interface EditorBlockPickerContextValue {
  items: readonly OpenEditorBlockPickerItem[];
  register: (items: readonly OpenEditorBlockPickerItem[]) => () => void;
}

const EditorUiContext = createContext<EditorUiContextValue | null>(null);
const EditorSiteContext = createContext<EditorSiteContextValue | null>(null);
const EditorBlockPickerContext =
  createContext<EditorBlockPickerContextValue | null>(null);

interface EditorProviderProps {
  siteId: string;
  permissions: EditorPermissions;
  canGoBack: boolean;
  onGoBack: () => void;
  onOpenPage: (pageId: string) => void;
  onResetPageHistory: () => void;
  children: ReactNode;
}

export function EditorProvider({
  siteId,
  permissions,
  canGoBack,
  onGoBack,
  onOpenPage,
  onResetPageHistory,
  children,
}: EditorProviderProps) {
  const { canEdit, isAdmin, isLoading: isPermissionsLoading } = permissions;
  const [blockPickerItems, setBlockPickerItems] = useState<
    readonly OpenEditorBlockPickerItem[]
  >([]);
  const activeBlockPicker = useRef<symbol | null>(null);

  const registerBlockPicker = (items: readonly OpenEditorBlockPickerItem[]) => {
    const registration = Symbol("editor-block-picker");
    activeBlockPicker.current = registration;
    setBlockPickerItems(items);

    return () => {
      if (activeBlockPicker.current !== registration) return;
      activeBlockPicker.current = null;
      setBlockPickerItems([]);
    };
  };

  const uiValue: EditorUiContextValue = {
    canGoBack,
    goBack: onGoBack,
    openPage: onOpenPage,
    resetPageHistory: onResetPageHistory,
  };
  const blockPickerValue: EditorBlockPickerContextValue = {
    items: blockPickerItems,
    register: registerBlockPicker,
  };

  return (
    <EditorSiteContext.Provider
      value={{
        siteId,
        canEdit,
        isAdmin,
        isPermissionsLoading,
      }}
    >
      <EditorBlockPickerContext.Provider value={blockPickerValue}>
        <EditorUiContext.Provider value={uiValue}>
          {children}
        </EditorUiContext.Provider>
      </EditorBlockPickerContext.Provider>
    </EditorSiteContext.Provider>
  );
}

export function useEditorUi() {
  const context = use(EditorUiContext);
  if (!context) {
    throw new Error("useEditorUi must be used within an EditorProvider");
  }
  return context;
}

export function useEditorSite() {
  const context = use(EditorSiteContext);
  if (!context) {
    throw new Error("useEditorSite must be used within an EditorProvider");
  }
  return context;
}

export function useEditorSiteOptional() {
  return use(EditorSiteContext);
}

export function useEditorBlockPicker() {
  const context = use(EditorBlockPickerContext);
  if (!context) {
    throw new Error(
      "useEditorBlockPicker must be used within an EditorProvider",
    );
  }
  return context;
}

export function useRegisterEditorBlockPicker(
  controller: OpenEditorController,
  enabled = true,
) {
  const { register } = useEditorBlockPicker();
  const readBlockPickerItems = useEffectEvent(() =>
    getDefaultBlockPickerItems(controller),
  );
  const registerBlockPicker = useEffectEvent(register);

  useEffect(() => {
    if (!enabled || !controller.ready) return;
    return registerBlockPicker(readBlockPickerItems());
  }, [controller.ready, enabled]);
}
