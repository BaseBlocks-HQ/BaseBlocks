"use client";

import { Button } from "@baseblocks/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { Check, Pencil, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

  useEffect(() => {
    if (!editingId || !inputRef.current) {
      return;
    }

    inputRef.current.focus();
    inputRef.current.select();
  }, [editingId]);

  const activeItem = items.find((item) => item.id === activeId) ?? items[0];

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

  const renderEditableInput = (className: string, buttonClassName: string) => (
    <div className="flex items-center gap-1 min-w-0 flex-1">
      <input
        ref={inputRef}
        value={editingLabel}
        onBlur={commitRename}
        onChange={(event) => setEditingLabel(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commitRename();
          }
          if (event.key === "Escape") {
            setEditingId(null);
          }
        }}
        className={className}
      />
      <button
        type="button"
        onClick={commitRename}
        className={buttonClassName}
        aria-label={renameLabel}
      >
        <Check className="h-3 w-3" />
      </button>
    </div>
  );

  return (
    <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-1 border-b bg-muted/30 min-w-0">
      {tabsMode === "dropdown" ? (
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {editingId === activeItem?.id ? (
            renderEditableInput(
              "h-8 flex-1 rounded-md border bg-background px-2 text-xs",
              "p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground",
            )
          ) : (
            <Select value={activeItem?.id} onValueChange={onActiveChange}>
              <SelectTrigger className="h-8 min-w-0 flex-1 text-xs">
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

          {activeItem && (
            <>
              <button
                type="button"
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                onClick={() => startRename(activeItem.id)}
                title={renameLabel}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              {onRemove && (
                <button
                  type="button"
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                  onClick={() => onRemove(activeItem.id)}
                  title={removeLabel}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={onAdd}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            title={addLabel}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 overflow-x-auto min-w-0 flex-1">
          {items.map((item) => (
            <div
              key={item.id}
              className={`group/tab flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors shrink-0 ${
                item.id === activeId
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {editingId === item.id ? (
                renderEditableInput(
                  "bg-transparent border-none outline-none w-20 text-xs text-inherit",
                  "p-0.5 rounded hover:bg-white/20",
                )
              ) : (
                <>
                  <button
                    type="button"
                    className="max-w-[10rem] truncate text-left"
                    onClick={() => onActiveChange(item.id)}
                    onDoubleClick={() => startRename(item.id)}
                  >
                    {item.label}
                  </button>
                  <button
                    type="button"
                    className="p-0.5 rounded opacity-0 group-hover/tab:opacity-100 transition-opacity hover:bg-white/20"
                    onClick={(event) => {
                      event.stopPropagation();
                      startRename(item.id);
                    }}
                    aria-label={renameLabel}
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </button>
                  {onRemove && (
                    <button
                      type="button"
                      className="p-0.5 rounded opacity-0 group-hover/tab:opacity-100 transition-opacity hover:bg-white/20"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemove(item.id);
                      }}
                      aria-label={removeLabel}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
            onClick={onAdd}
            aria-label={addLabel}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {endContent}
    </div>
  );
}
