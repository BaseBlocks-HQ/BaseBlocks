"use client";

import { useEditorContext } from "@/modules/shared/contexts/editor-context";
import type { PageTab } from "@/modules/shared/types";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@baseblocks/ui/tabs";
import { Pencil, Plus, Trash2, X } from "lucide-react";

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
  const { clearSelection, showControls } = useEditorContext();

  return (
    <div
      className="group/tabbar mb-6 flex items-center justify-center gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      {showControls && (
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
      )}

      <Tabs
        value={activeTabId ?? undefined}
        onValueChange={(value) => {
          setActiveTabId(value);
          clearSelection();
        }}
      >
        <TabsList>
          {pageTabs.map((tab, index) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="group/tab relative gap-1 px-4"
            >
              {editingTabId === tab.id ? (
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
                <span className="select-none">{tab.label}</span>
              )}
              {showControls && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover/tab:opacity-100 transition-opacity">
                  <span
                    role="button"
                    tabIndex={0}
                    className="h-4 w-4 rounded-sm flex items-center justify-center text-muted-foreground/50 hover:text-foreground cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartRenameTab(tab);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        onStartRenameTab(tab);
                      }
                    }}
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </span>
                  {index >= 2 && (
                    <span
                      role="button"
                      tabIndex={0}
                      className="h-4 w-4 rounded-sm flex items-center justify-center text-muted-foreground/50 hover:text-destructive cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveTab(tab.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          onRemoveTab(tab.id);
                        }
                      }}
                    >
                      <X className="h-3 w-3" />
                    </span>
                  )}
                </div>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={onAddTab}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
