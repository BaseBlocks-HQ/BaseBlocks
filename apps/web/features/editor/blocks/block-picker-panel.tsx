"use client";

import { useEditorBlockPicker } from "@/features/editor/editor-state";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@baseblocks/ui/sidebar";
import {
  Blocks,
  ChevronRight,
  Code2,
  Columns2,
  FileText,
  GitBranch,
  Heading,
  Image,
  List,
  ListOrdered,
  ListTodo,
  MessageSquare,
  Minus,
  Pilcrow,
  Quote,
  Table2,
  Upload,
  type LucideIcon,
} from "lucide-react";

const GROUPS = [
  { id: "embed", label: "Blocks" },
  { id: "layout", label: "Layout" },
  { id: "media", label: "Media" },
  { id: "text", label: "Text" },
  { id: "structure", label: "Structure" },
] as const;
const KNOWN_GROUPS = new Set<string>(GROUPS.map((group) => group.id));

const BUILT_IN_ICONS: Record<string, LucideIcon> = {
  attachment: Upload,
  blockquote: Quote,
  bulletList: List,
  callout: MessageSquare,
  codeBlock: Code2,
  columns: Columns2,
  diagram: GitBranch,
  divider: Minus,
  image: Image,
  orderedList: ListOrdered,
  page: FileText,
  paragraph: Pilcrow,
  table: Table2,
  taskList: ListTodo,
  toggleList: ChevronRight,
};

function getBuiltInIcon(key: string) {
  if (/^heading[1-6]$/.test(key)) return Heading;
  return BUILT_IN_ICONS[key] ?? Blocks;
}

export function BlockPickerPanel() {
  const { items } = useEditorBlockPicker();
  const groups = [
    ...GROUPS,
    ...Array.from(new Set(items.map((item) => item.group)))
      .filter((group) => !KNOWN_GROUPS.has(group))
      .map((group) => ({ id: group, label: group })),
  ];

  return (
    <div className="pb-3">
      <div className="flex h-14 items-center px-3">
        <p className="text-sm font-semibold">Blocks</p>
      </div>

      {groups.map((group) => {
        const groupItems = items.filter((item) => item.group === group.id);
        if (groupItems.length === 0) return null;

        return (
          <section className="px-2 pb-3" key={group.id}>
            <p className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
              {group.label}
            </p>
            <SidebarMenu className="gap-0.5">
              {groupItems.map((item) => {
                const ItemIcon = item.icon ?? getBuiltInIcon(item.key);

                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      className="h-8 gap-2 px-2 font-normal"
                      onClick={item.insert}
                      onMouseDown={(event) => event.preventDefault()}
                      type="button"
                    >
                      <ItemIcon
                        aria-hidden={true}
                        className="size-4 shrink-0 text-muted-foreground"
                        size={16}
                        strokeWidth={2}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </section>
        );
      })}

      {items.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">
          Select an editable page to insert blocks.
        </p>
      ) : null}
    </div>
  );
}
