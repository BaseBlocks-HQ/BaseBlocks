"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@baseblocks/ui/tabs";

export interface ViewerTabItem {
  id: string;
  label: string;
}

interface ViewerTabsBarProps {
  activeId: string;
  items: ViewerTabItem[];
  onActiveChange: (id: string) => void;
  tabsMode: "dropdown" | "row";
}

/**
 * Read-only tab strip using the same {@link Tabs} / {@link TabsList} / {@link TabsTrigger}
 * pattern as the page “tabs” layout ({@link PageTabBar}).
 */
export function ViewerTabsBar({
  activeId,
  items,
  onActiveChange,
  tabsMode,
}: ViewerTabsBarProps) {
  const resolvedActiveId =
    items.find((item) => item.id === activeId)?.id ?? items[0]?.id ?? "";
  const activeItem =
    items.find((item) => item.id === resolvedActiveId) ?? items[0];

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={
        tabsMode === "dropdown"
          ? "flex w-full min-w-0 px-1.5 py-1"
          : "flex min-w-0 items-center justify-start px-1.5 py-1"
      }
    >
      {tabsMode === "dropdown" ? (
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
      ) : (
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
                  className="max-w-[12rem] shrink-0 flex-none px-2.5"
                >
                  <span className="select-none truncate">{item.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}
    </div>
  );
}
