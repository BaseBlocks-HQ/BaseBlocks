"use client";

import type { PageTab } from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@baseblocks/ui/tabs";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { nanoid } from "nanoid";
import { useRef, useState } from "react";

interface PageTabsProps {
  tabs: PageTab[];
  activeTabId: string;
  onActiveTabChange: (tabId: string) => void;
  onChange: (tabs: PageTab[]) => void;
  onDisable: () => void;
}

export function PageTabs({
  tabs,
  activeTabId,
  onActiveTabChange,
  onChange,
  onDisable,
}: PageTabsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const activeTabIndex = activeTab
    ? tabs.findIndex((tab) => tab.id === activeTab.id)
    : -1;

  const finishRename = () => {
    if (!editingId) return;
    onChange(
      tabs.map((tab) =>
        tab.id === editingId
          ? { ...tab, label: editingLabel.trim() || tab.label }
          : tab,
      ),
    );
    setEditingId(null);
  };

  const startRename = () => {
    if (!activeTab) return;
    setEditingId(activeTab.id);
    setEditingLabel(activeTab.label);
    requestAnimationFrame(() => inputRef.current?.select());
  };

  const removeActiveTab = () => {
    if (!activeTab || activeTabIndex < 2) return;
    const nextTabs = tabs.filter((tab) => tab.id !== activeTab.id);
    onChange(nextTabs);
    onActiveTabChange(nextTabs[0]?.id ?? "");
  };

  return (
    <div
      className="group mb-6 flex items-center justify-center gap-2"
      role="presentation"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Disable tabs"
        className="opacity-0 group-hover:opacity-100"
        onClick={onDisable}
      >
        <Trash2 className="size-3.5" />
      </Button>

      <Tabs value={activeTabId} onValueChange={onActiveTabChange}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="px-3">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {editingId && activeTab?.id === editingId ? (
        <Input
          ref={inputRef}
          value={editingLabel}
          aria-label="Rename tab"
          className="h-7 w-24 px-2 py-0 text-sm"
          onChange={(event) => setEditingLabel(event.target.value)}
          onBlur={finishRename}
          onKeyDown={(event) => {
            if (event.key === "Enter") finishRename();
            if (event.key === "Escape") setEditingId(null);
          }}
        />
      ) : (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Rename active tab"
            onClick={startRename}
          >
            <Pencil className="size-3" />
          </Button>
          {activeTabIndex >= 2 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Remove active tab"
              className="text-muted-foreground hover:text-destructive"
              onClick={removeActiveTab}
            >
              <X className="size-3" />
            </Button>
          ) : null}
        </div>
      )}

      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Add tab"
        onClick={() =>
          onChange([
            ...tabs,
            { id: nanoid(10), label: `Tab ${tabs.length + 1}` },
          ])
        }
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  );
}
