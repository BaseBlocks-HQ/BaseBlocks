"use client";

import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { Fragment, type ComponentProps, type ReactNode } from "react";
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
          ? "overflow-hidden rounded-[1.5rem] bg-card shadow-[0_1px_2px_oklch(0_0_0/0.06),0_16px_48px_oklch(0_0_0/0.08)]"
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
}: {
  items: ActionItem[];
  label: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label={label} size="icon-xs" type="button" variant="ghost">
          <HugeiconsIcon icon={MoreHorizontalIcon} />
        </Button>
      </DropdownMenuTrigger>
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
