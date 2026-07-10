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
          {tabs.map((tab, index) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="group/tab flex items-center gap-1.5 px-3"
            >
              {editingId === tab.id ? (
                <Input
                  ref={inputRef}
                  value={editingLabel}
                  className="h-5 w-20 border-none px-1 py-0 text-sm shadow-none"
                  onChange={(event) => setEditingLabel(event.target.value)}
                  onBlur={finishRename}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") finishRename();
                    if (event.key === "Escape") setEditingId(null);
                  }}
                />
              ) : (
                <>
                  <span>{tab.label}</span>
                  <span className="hidden items-center gap-0.5 group-hover/tab:flex">
                    <button
                      type="button"
                      aria-label="Rename tab"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingId(tab.id);
                        setEditingLabel(tab.label);
                        requestAnimationFrame(() => inputRef.current?.select());
                      }}
                    >
                      <Pencil className="size-3" />
                    </button>
                    {index >= 2 ? (
                      <button
                        type="button"
                        aria-label="Remove tab"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={(event) => {
                          event.stopPropagation();
                          const nextTabs = tabs.filter(
                            (candidate) => candidate.id !== tab.id,
                          );
                          onChange(nextTabs);
                          if (activeTabId === tab.id) {
                            onActiveTabChange(nextTabs[0]?.id ?? "");
                          }
                        }}
                      >
                        <X className="size-3" />
                      </button>
                    ) : null}
                  </span>
                </>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

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
