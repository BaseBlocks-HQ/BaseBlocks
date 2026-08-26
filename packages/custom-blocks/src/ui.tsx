"use client";

import {
  ArrowDown01Icon,
  MoreHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { closestCenter } from "@dnd-kit/collision";
import { PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
import { DragDropProvider, DragOverlay, KeyboardSensor } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import {
  cloneElement,
  Fragment,
  type ComponentProps,
  type MutableRefObject,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  useRef,
  useState,
} from "react";
import { cn } from "@baseblocks/ui/lib/utils";

export const selectClassName =
  "h-9 min-w-0 rounded-xl border border-input bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

export type BlockWidth = "default" | "full";

/**
 * Breakout width for blocks allowed to leave the document text column. Host
 * layouts opt in by defining --bb-full-width; without it the block keeps the
 * column width, so embedded contexts are unaffected.
 */
const fullWidthClassName =
  "mx-[calc((100%-var(--bb-full-width,100%))/2)] w-[var(--bb-full-width,100%)]";

export function BlockShell({
  children,
  label,
  surface = false,
  width = "default",
}: {
  children: ReactNode;
  label: string;
  surface?: boolean;
  width?: BlockWidth;
}) {
  return (
    <section
      aria-label={label}
      className={cn(
        "not-prose my-4",
        surface
          ? "overflow-hidden rounded-[1.5rem] border border-border/80 bg-card shadow-[0_1px_2px_oklch(0_0_0/0.04),0_12px_36px_oklch(0_0_0/0.06)]"
          : "space-y-3",
        width === "full" ? fullWidthClassName : null,
      )}
    >
      {children}
    </section>
  );
}

export function BlockToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-2xl bg-card p-2 shadow-xs">
      {children}
    </div>
  );
}

export type ActionItem = {
  destructive?: boolean;
  disabled?: boolean;
  icon?: ComponentProps<typeof HugeiconsIcon>["icon"];
  label: string;
  onSelect: () => void | Promise<void>;
  separatorBefore?: boolean;
};

export function ActionMenu({
  items,
  label,
  trigger,
}: {
  items: ActionItem[];
  label: string;
  trigger?: ReactElement<ComponentProps<"button">>;
}) {
  const [open, setOpen] = useState(false);
  const controlledTrigger = trigger
    ? cloneElement(trigger, {
        "aria-expanded": open,
        onClick: (event: MouseEvent<HTMLButtonElement>) => {
          trigger.props.onClick?.(event);
          if (!event.defaultPrevented) setOpen((current) => !current);
        },
      })
    : undefined;
  return (
    <DropdownMenu
      onOpenChange={
        trigger
          ? (next) => {
              if (!next) setOpen(false);
            }
          : undefined
      }
      open={trigger ? open : undefined}
    >
      {controlledTrigger ? (
        <span className="relative inline-flex">
          {controlledTrigger}
          <DropdownMenuTrigger asChild>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
            />
          </DropdownMenuTrigger>
        </span>
      ) : (
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={label}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <HugeiconsIcon aria-hidden icon={MoreHorizontalIcon} />
          </Button>
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent align="end" className="min-w-48 rounded-xl">
        {items.map((item) => (
          <Fragment key={item.label}>
            {item.separatorBefore ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              disabled={item.disabled}
              onSelect={() => void item.onSelect()}
              variant={item.destructive ? "destructive" : "default"}
            >
              {item.icon ? <HugeiconsIcon icon={item.icon} /> : null}
              {item.label}
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type CollectionSortData = { kind: "collection-option"; id: string };
type CollectionOption = { id: string; label: string };

const collectionSensors = [
  PointerSensor.configure({
    activationConstraints: () => [
      new PointerActivationConstraints.Distance({ value: 5 }),
    ],
  }),
  KeyboardSensor,
];

function SortableCollectionOption({
  index,
  option,
  suppressMenuClick,
}: {
  index: number;
  option: CollectionOption;
  suppressMenuClick: MutableRefObject<boolean>;
}) {
  const sortable = useSortable<CollectionSortData>({
    id: option.id,
    index,
    group: "collection-options",
    data: { kind: "collection-option", id: option.id },
    collisionDetector: closestCenter,
    type: "collection-option",
    accept: "collection-option",
  });
  return (
    <DropdownMenuRadioItem
      className={cn(
        "cursor-grab touch-none active:cursor-grabbing",
        sortable.isDropTarget && "bg-muted/60",
        sortable.isDragging && "opacity-40",
      )}
      onSelect={(event) => {
        if (!suppressMenuClick.current) return;
        event.preventDefault();
        suppressMenuClick.current = false;
      }}
      ref={(element) => {
        sortable.ref(element);
        sortable.handleRef(element);
      }}
      value={option.id}
    >
      <span className="truncate">{option.label}</span>
    </DropdownMenuRadioItem>
  );
}

export function CollectionMenu({
  currentId,
  items,
  label,
  onChange,
  onReorder,
  options,
  valueLabel,
}: {
  currentId: string;
  items: ActionItem[];
  label: string;
  onChange: (id: string) => void;
  onReorder?: (sourceId: string, targetId: string) => void;
  options: CollectionOption[];
  valueLabel: string;
}) {
  const suppressMenuClick = useRef(false);
  const optionGroup = (
    <DropdownMenuRadioGroup onValueChange={onChange} value={currentId}>
      {options.map((option, index) =>
        onReorder ? (
          <SortableCollectionOption
            index={index}
            key={option.id}
            option={option}
            suppressMenuClick={suppressMenuClick}
          />
        ) : (
          <DropdownMenuRadioItem key={option.id} value={option.id}>
            <span className="truncate">{option.label}</span>
          </DropdownMenuRadioItem>
        ),
      )}
    </DropdownMenuRadioGroup>
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={label}
          className="min-w-0 max-w-72 justify-start gap-2 px-2 font-semibold"
          size="sm"
          type="button"
          variant="ghost"
        >
          <span className="truncate">{valueLabel}</span>
          <HugeiconsIcon
            aria-hidden
            className="ml-auto size-3.5 text-muted-foreground"
            icon={ArrowDown01Icon}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56 rounded-xl">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {label}
        </DropdownMenuLabel>
        {onReorder ? (
          <DragDropProvider
            sensors={collectionSensors}
            onDragStart={() => {
              suppressMenuClick.current = true;
            }}
            onDragEnd={(event) => {
              const source = event.operation.source;
              if (!event.canceled && isSortable(source)) {
                const sourceData = source.data as
                  | CollectionSortData
                  | undefined;
                const target = options[source.index];
                if (
                  sourceData?.kind === "collection-option" &&
                  target &&
                  source.initialIndex !== source.index
                ) {
                  onReorder(sourceData.id, target.id);
                }
              }
              window.setTimeout(() => {
                suppressMenuClick.current = false;
              }, 250);
            }}
          >
            {optionGroup}
            <DragOverlay>
              {(source) => {
                const sourceData = source.data as
                  | CollectionSortData
                  | undefined;
                const option = options.find(({ id }) => id === sourceData?.id);
                return option ? (
                  <div className="max-w-64 truncate rounded-lg bg-popover px-3 py-2 text-sm shadow-xl">
                    {option.label}
                  </div>
                ) : null;
              }}
            </DragOverlay>
          </DragDropProvider>
        ) : (
          optionGroup
        )}
        <DropdownMenuSeparator />
        {items.map((item) => (
          <Fragment key={item.label}>
            {item.separatorBefore ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              disabled={item.disabled}
              onSelect={() => void item.onSelect()}
              variant={item.destructive ? "destructive" : "default"}
            >
              {item.icon ? (
                <HugeiconsIcon aria-hidden icon={item.icon} />
              ) : null}
              {item.label}
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
