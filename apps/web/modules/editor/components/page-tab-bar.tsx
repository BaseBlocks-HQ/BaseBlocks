"use client";

import { useEditorUi } from "@/modules/editor/state";
import type { PageTab } from "@/modules/editor/types";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@baseblocks/ui/tabs";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { KeyboardEvent, MouseEvent } from "react";

interface PageTabBarProps {
  pageTabs: PageTab[];
  activeTabId: string | null;
  setActiveTabId: (tabId: string | null) => void;
  editingTabId: string | null;
  editingLabel: string;
  setEditingLabel: (label: string) => void;
  setEditingTabId: (tabId: string | null) => void;
  tabInputRef: React.RefObject<HTMLInputElement | null>;
  onDisableTabs: () => void;
  onAddTab: () => void;
  onRemoveTab: (tabId: string) => void;
  onStartRenameTab: (tab: PageTab) => void;
  onFinishRenameTab: () => void;
}

interface TabIconButtonProps {
  "aria-label": string;
  destructive?: boolean;
  onClick: (e: MouseEvent<HTMLSpanElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLSpanElement>) => void;
  children: React.ReactNode;
}

function TabIconButton({
  "aria-label": ariaLabel,
  destructive = false,
  onClick,
  onKeyDown,
  children,
}: TabIconButtonProps) {
  return (
    <span
      role="button"
      tabIndex={-1}
      aria-label={ariaLabel}
      className={[
        "h-4 w-4 rounded-sm flex items-center justify-center cursor-pointer",
        "text-muted-foreground/50",
        destructive ? "hover:text-destructive" : "hover:text-foreground",
      ].join(" ")}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {children}
    </span>
  );
}

export function PageTabBar({
  pageTabs,
  activeTabId,
  setActiveTabId,
  editingTabId,
  editingLabel,
  setEditingLabel,
  setEditingTabId,
  tabInputRef,
  onDisableTabs,
  onAddTab,
  onRemoveTab,
  onStartRenameTab,
  onFinishRenameTab,
}: PageTabBarProps) {
  const { clearSelection } = useEditorUi();
  const t = useTranslations("editor.pageTabBar");

  return (
    <div
      className="group/tabbar mb-6 flex items-center justify-center gap-2"
      role="presentation"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="opacity-0 group-hover/tabbar:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={onDisableTabs}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Tabs
        value={activeTabId ?? undefined}
        onValueChange={(value) => {
          setActiveTabId(value);
          clearSelection();
        }}
      >
        <TabsList>
          {pageTabs.map((tab, index) => {
            const isEditing = editingTabId === tab.id;
            // First two tabs are protected — require a minimum of two tabs
            const canRemove = index >= 2;

            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="group/tab flex items-center gap-1.5 px-3"
              >
                {isEditing ? (
                  <Input
                    ref={tabInputRef}
                    value={editingLabel}
                    onChange={(e) => setEditingLabel(e.target.value)}
                    onBlur={onFinishRenameTab}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onFinishRenameTab();
                      if (e.key === "Escape") setEditingTabId(null);
                    }}
                    className="h-5 w-20 px-1 py-0 text-sm border-none shadow-none focus-visible:ring-1"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <span className="select-none">{tab.label}</span>
                    <div className="hidden group-hover/tab:flex items-center gap-0.5">
                      <TabIconButton
                        aria-label={t("renameTab")}
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartRenameTab(tab);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            onStartRenameTab(tab);
                          }
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </TabIconButton>
                      {canRemove && (
                        <TabIconButton
                          aria-label={t("removeTab")}
                          destructive
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveTab(tab.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              onRemoveTab(tab.id);
                            }
                          }}
                        >
                          <X className="h-3 w-3" />
                        </TabIconButton>
                      )}
                    </div>
                  </>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={onAddTab}
        aria-label={t("addTab")}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
