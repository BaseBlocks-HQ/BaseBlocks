"use client";

import { cn } from "@/lib/utils";
import { LAYOUT_TYPES } from "@/types";
import type { BlockType, LayoutType } from "@/types";
import {
  AlertTriangle,
  ChevronRight,
  Code,
  Columns2,
  FolderOpen,
  Heading,
  LayoutGrid,
  Link2,
  Minus,
  MoveVertical,
  PanelRight,
  Rows2,
  Search,
  Square,
  Text,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useRef, useEffect } from "react";

type FlyoutType = "layouts" | "blocks" | null;

interface ComponentsFlyoutProps {
  selectedSlotId?: string | null;
  onAddLayout?: (type: LayoutType) => void;
  onAddBlock?: (type: BlockType) => void;
}

const LAYOUT_ICONS: Record<LayoutType, React.ReactNode> = {
  single: <Square className="h-5 w-5" />,
  rows: <Rows2 className="h-5 w-5" />,
  columns: <Columns2 className="h-5 w-5" />,
  grid: <LayoutGrid className="h-5 w-5" />,
  vertical: <PanelRight className="h-5 w-5" />,
  spacer: <MoveVertical className="h-5 w-5" />,
};

const LAYOUT_PREVIEWS: Record<LayoutType, React.ReactNode> = {
  single: (
    <div className="w-full h-full p-2">
      <div className="w-full h-full bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
    </div>
  ),
  rows: (
    <div className="w-full h-full p-2 flex flex-col gap-1">
      <div className="flex-1 bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
      <div className="flex-1 bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
    </div>
  ),
  columns: (
    <div className="w-full h-full p-2 flex gap-1">
      <div className="flex-1 bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
      <div className="flex-1 bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
    </div>
  ),
  grid: (
    <div className="w-full h-full p-2 grid grid-cols-2 grid-rows-2 gap-1">
      <div className="bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
      <div className="bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
      <div className="bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
      <div className="bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
    </div>
  ),
  vertical: (
    <div className="w-full h-full p-2 flex gap-1">
      <div className="flex-[2] bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
      <div className="flex-1 bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
    </div>
  ),
  spacer: (
    <div className="w-full h-full p-2 flex flex-col items-center justify-center gap-1">
      <div className="w-full h-1 bg-muted-foreground/20 rounded" />
      <MoveVertical className="h-4 w-4 text-muted-foreground/40" />
      <div className="w-full h-1 bg-muted-foreground/20 rounded" />
    </div>
  ),
};

const BLOCK_ITEMS: Array<{
  type: BlockType;
  label: string;
  icon: React.ReactNode;
  preview: React.ReactNode;
}> = [
  {
    type: "heading",
    label: "Heading",
    icon: <Heading className="h-5 w-5" />,
    preview: (
      <div className="w-full h-full p-3 flex flex-col justify-center">
        <div className="h-3 w-3/4 bg-foreground/80 rounded" />
        <div className="h-2 w-1/2 bg-muted-foreground/30 rounded mt-2" />
      </div>
    ),
  },
  {
    type: "paragraph",
    label: "Paragraph",
    icon: <Text className="h-5 w-5" />,
    preview: (
      <div className="w-full h-full p-3 flex flex-col justify-center gap-1.5">
        <div className="h-1.5 w-full bg-muted-foreground/30 rounded" />
        <div className="h-1.5 w-full bg-muted-foreground/30 rounded" />
        <div className="h-1.5 w-3/4 bg-muted-foreground/30 rounded" />
      </div>
    ),
  },
  {
    type: "callout",
    label: "Callout",
    icon: <AlertTriangle className="h-5 w-5" />,
    preview: (
      <div className="w-full h-full p-3 flex items-center">
        <div className="w-full h-full bg-blue-500/10 rounded border-l-2 border-blue-500 flex items-center gap-2 px-2">
          <AlertTriangle className="h-3 w-3 text-blue-500 shrink-0" />
          <div className="flex-1">
            <div className="h-1.5 w-full bg-muted-foreground/30 rounded" />
          </div>
        </div>
      </div>
    ),
  },
  {
    type: "code",
    label: "Code",
    icon: <Code className="h-5 w-5" />,
    preview: (
      <div className="w-full h-full p-3">
        <div className="w-full h-full bg-zinc-900 rounded p-2 flex flex-col gap-1">
          <div className="h-1 w-1/2 bg-emerald-500/50 rounded" />
          <div className="h-1 w-3/4 bg-sky-500/50 rounded" />
          <div className="h-1 w-1/3 bg-amber-500/50 rounded" />
        </div>
      </div>
    ),
  },
  {
    type: "divider",
    label: "Divider",
    icon: <Minus className="h-5 w-5" />,
    preview: (
      <div className="w-full h-full p-3 flex items-center">
        <div className="w-full h-px bg-border" />
      </div>
    ),
  },
  {
    type: "spacer",
    label: "Spacer",
    icon: <MoveVertical className="h-5 w-5" />,
    preview: (
      <div className="w-full h-full p-3 flex flex-col items-center justify-center gap-2">
        <div className="w-full h-px bg-muted-foreground/20" />
        <MoveVertical className="h-3 w-3 text-muted-foreground/40" />
        <div className="w-full h-px bg-muted-foreground/20" />
      </div>
    ),
  },
  {
    type: "library",
    label: "Library",
    icon: <FolderOpen className="h-5 w-5" />,
    preview: (
      <div className="w-full h-full p-3 flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <FolderOpen className="h-3 w-3 text-muted-foreground" />
          <div className="h-1.5 w-16 bg-muted-foreground/30 rounded" />
        </div>
        <div className="ml-4 flex flex-col gap-1">
          <div className="h-1.5 w-12 bg-muted-foreground/20 rounded" />
          <div className="h-1.5 w-14 bg-muted-foreground/20 rounded" />
        </div>
      </div>
    ),
  },
  {
    type: "search",
    label: "Search",
    icon: <Search className="h-5 w-5" />,
    preview: (
      <div className="w-full h-full p-3 flex items-center">
        <div className="w-full h-8 bg-muted rounded-md border flex items-center gap-2 px-2">
          <Search className="h-3 w-3 text-muted-foreground" />
          <div className="h-1.5 w-16 bg-muted-foreground/30 rounded" />
        </div>
      </div>
    ),
  },
  {
    type: "quicklinks",
    label: "Quicklinks",
    icon: <Link2 className="h-5 w-5" />,
    preview: (
      <div className="w-full h-full p-3 flex gap-2">
        <div className="flex-1 h-full bg-muted rounded border flex flex-col items-center justify-center p-1">
          <div className="h-4 w-4 bg-muted-foreground/20 rounded" />
          <div className="h-1 w-8 bg-muted-foreground/30 rounded mt-1" />
        </div>
        <div className="flex-1 h-full bg-muted rounded border flex flex-col items-center justify-center p-1">
          <div className="h-4 w-4 bg-muted-foreground/20 rounded" />
          <div className="h-1 w-8 bg-muted-foreground/30 rounded mt-1" />
        </div>
      </div>
    ),
  },
];

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onMouseEnter: () => void;
  disabled?: boolean;
}

function MenuItem({ icon, label, isActive, onMouseEnter, disabled }: MenuItemProps) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left",
        isActive && "bg-accent",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-accent cursor-pointer"
      )}
      onMouseEnter={onMouseEnter}
      disabled={disabled}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

interface LayoutCardProps {
  type: LayoutType;
  label: string;
  preview: React.ReactNode;
  onClick: () => void;
}

function LayoutCard({ type, label, preview, onClick }: LayoutCardProps) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col rounded-lg border bg-card overflow-hidden hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="aspect-[4/3] bg-muted/30 border-b">
        {preview}
      </div>
      <div className="p-2 flex items-center gap-2">
        <span className="text-muted-foreground">{LAYOUT_ICONS[type]}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
    </button>
  );
}

interface BlockCardProps {
  type: BlockType;
  label: string;
  icon: React.ReactNode;
  preview: React.ReactNode;
  onClick: () => void;
}

function BlockCard({ label, icon, preview, onClick }: BlockCardProps) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col rounded-lg border bg-card overflow-hidden hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="aspect-[4/3] bg-muted/30 border-b">
        {preview}
      </div>
      <div className="p-2 flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
    </button>
  );
}

export function ComponentsFlyout({
  selectedSlotId,
  onAddLayout,
  onAddBlock,
}: ComponentsFlyoutProps) {
  const t = useTranslations();
  const [activeFlyout, setActiveFlyout] = useState<FlyoutType>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (type: FlyoutType) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setActiveFlyout(type);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveFlyout(null);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex"
      onMouseLeave={handleMouseLeave}
    >
      {/* Menu items */}
      <div className="w-full p-2 space-y-1">
        <MenuItem
          icon={<LayoutGrid className="h-5 w-5" />}
          label={t("editor.sidebar.layouts")}
          isActive={activeFlyout === "layouts"}
          onMouseEnter={() => handleMouseEnter("layouts")}
        />
        <MenuItem
          icon={<Square className="h-5 w-5" />}
          label={t("editor.sidebar.blocks")}
          isActive={activeFlyout === "blocks"}
          onMouseEnter={() => handleMouseEnter("blocks")}
          disabled={!selectedSlotId}
        />
        {!selectedSlotId && (
          <p className="text-xs text-muted-foreground px-3 py-1">
            {t("editor.sidebar.selectSlot")}
          </p>
        )}
      </div>

      {/* Flyout panel */}
      {activeFlyout && (
        <div
          className="absolute left-full top-0 ml-1 w-80 bg-popover border rounded-lg shadow-lg z-50 max-h-[calc(100vh-200px)] overflow-auto"
          onMouseEnter={() => handleMouseEnter(activeFlyout)}
        >
          {activeFlyout === "layouts" && (
            <div className="p-4">
              <h3 className="font-semibold text-sm mb-3">
                {t("editor.sidebar.layouts")}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {LAYOUT_TYPES.map((layout) => (
                  <LayoutCard
                    key={layout.type}
                    type={layout.type}
                    label={t(`editor.layouts.${layout.type}`)}
                    preview={LAYOUT_PREVIEWS[layout.type]}
                    onClick={() => {
                      onAddLayout?.(layout.type);
                      setActiveFlyout(null);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {activeFlyout === "blocks" && selectedSlotId && (
            <div className="p-4">
              <h3 className="font-semibold text-sm mb-3">
                {t("editor.sidebar.blocks")}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {BLOCK_ITEMS.map((block) => (
                  <BlockCard
                    key={block.type}
                    type={block.type}
                    label={t(`blocks.${block.type}`)}
                    icon={block.icon}
                    preview={block.preview}
                    onClick={() => {
                      onAddBlock?.(block.type);
                      setActiveFlyout(null);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
