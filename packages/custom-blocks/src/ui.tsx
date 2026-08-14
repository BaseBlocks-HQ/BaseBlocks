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
import {
  cloneElement,
  Fragment,
  type ComponentProps,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  useState,
} from "react";
import { cn } from "@baseblocks/ui/lib/utils";

export const selectClassName =
  "h-9 min-w-0 rounded-xl border border-input bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

export function BlockShell({
  children,
  label,
  surface = false,
}: {
  children: ReactNode;
  label: string;
  surface?: boolean;
}) {
  return (
    <section
      aria-label={label}
      className={cn(
        "not-prose my-4",
        surface
          ? "overflow-hidden rounded-[1.5rem] border border-border/80 bg-card shadow-[0_1px_2px_oklch(0_0_0/0.04),0_12px_36px_oklch(0_0_0/0.06)]"
          : "space-y-3",
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

export function CollectionMenu({
  currentId,
  items,
  label,
  onChange,
  options,
  valueLabel,
}: {
  currentId: string;
  items: ActionItem[];
  label: string;
  onChange: (id: string) => void;
  options: Array<{ id: string; label: string }>;
  valueLabel: string;
}) {
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
        <DropdownMenuRadioGroup onValueChange={onChange} value={currentId}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.id} value={option.id}>
              <span className="truncate">{option.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
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
