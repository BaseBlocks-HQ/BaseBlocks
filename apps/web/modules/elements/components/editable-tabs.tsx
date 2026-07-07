"use client";

import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@baseblocks/ui/tabs";
import { Pencil, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";

interface EditableTabItem {
  id: string;
  label: string;
}

interface EditableTabsProps {
  activeId: string;
  addLabel: string;
  endContent?: React.ReactNode;
  items: EditableTabItem[];
  onActiveChange: (id: string) => void;
  onAdd: () => void;
  onRemove?: (id: string) => void;
  onRename: (id: string, label: string) => void;
  removeLabel: string;
  renameLabel: string;
  tabsMode: "dropdown" | "row";
}

/** Matches {@link PageTabBar} icon affordances inside tab triggers */
function TabIconButton({
  "aria-label": ariaLabel,
  destructive = false,
  onClick,
  onKeyDown,
  children,
}: {
  "aria-label": string;
  destructive?: boolean;
  onClick: (e: MouseEvent<HTMLSpanElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLSpanElement>) => void;
  children: ReactNode;
}) {
  return (
    <span
      role="button"
      tabIndex={-1}
      aria-label={ariaLabel}
      className={[
        "flex h-4 w-4 cursor-pointer items-center justify-center rounded-sm",
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

export function EditableTabs({
  activeId,
  addLabel,
  endContent,
  items,
  onActiveChange,
  onAdd,
  onRemove,
  onRename,
  removeLabel,
  renameLabel,
  tabsMode,
}: EditableTabsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const resolvedActiveId =
    items.find((item) => item.id === activeId)?.id ?? items[0]?.id ?? "";
  const activeItem =
    items.find((item) => item.id === resolvedActiveId) ?? items[0];

  useEffect(() => {
    if (!editingId || !inputRef.current) {
      return;
    }

    inputRef.current.focus();
    inputRef.current.select();
  }, [editingId]);

  const startRename = (id: string) => {
    const item = items.find((entry) => entry.id === id);
    if (!item) {
      return;
    }

    setEditingId(id);
    setEditingLabel(item.label);
  };

  const commitRename = () => {
    if (!editingId) {
      return;
    }

    onRename(editingId, editingLabel.trim() || "Untitled");
    setEditingId(null);
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex min-w-0 items-center justify-between gap-1 px-1.5 py-1">
      <div
        className={
          tabsMode === "dropdown"
            ? "flex min-w-0 flex-1 items-center gap-1.5"
            : "group/tabbar flex min-w-0 flex-1 items-center justify-start gap-1.5"
        }
      >
        {tabsMode === "dropdown" ? (
          <>
            {editingId === activeItem?.id ? (
              <Input
                ref={inputRef}
                value={editingLabel}
                onChange={(e) => setEditingLabel(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="h-7 min-w-0 flex-1 text-xs"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <Select value={activeItem?.id} onValueChange={onActiveChange}>
                <SelectTrigger className="h-7 w-fit min-w-[7rem] max-w-[14rem] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {activeItem && editingId !== activeItem.id && (
              <>
                <button
                  type="button"
                  className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  onClick={() => startRename(activeItem.id)}
                  title={renameLabel}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {onRemove && (
                  <button
                    type="button"
                    className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    onClick={() => onRemove(activeItem.id)}
                    title={removeLabel}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={onAdd}
              aria-label={addLabel}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <>
            <div className="max-w-full min-w-0 overflow-x-auto overflow-y-hidden">
              <Tabs
                value={resolvedActiveId}
                onValueChange={onActiveChange}
                className="!flex-row gap-0"
              >
                <TabsList className="justify-start">
                  {items.map((item) => (
                    <TabsTrigger
                      key={item.id}
                      value={item.id}
                      className="group/tab flex max-w-[12rem] shrink-0 flex-none items-center gap-1.5 px-2.5"
                    >
                      {editingId === item.id ? (
                        <Input
                          ref={inputRef}
                          value={editingLabel}
                          onChange={(e) => setEditingLabel(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="h-5 w-20 border-none px-1 py-0 text-sm shadow-none focus-visible:ring-1"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <span
                            className="max-w-[10rem] select-none truncate"
                            onDoubleClick={(e) => {
                              e.preventDefault();
                              startRename(item.id);
                            }}
                          >
                            {item.label}
                          </span>
                          <div className="hidden items-center gap-0.5 group-hover/tab:flex">
                            <TabIconButton
                              aria-label={renameLabel}
                              onClick={(e) => {
                                e.stopPropagation();
                                startRename(item.id);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  startRename(item.id);
                                }
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </TabIconButton>
                            {onRemove && (
                              <TabIconButton
                                aria-label={removeLabel}
                                destructive
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemove(item.id);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onRemove(item.id);
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
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={onAdd}
              aria-label={addLabel}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>

      {endContent}
    </div>
  );
}
