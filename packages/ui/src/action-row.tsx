"use client";

import { Slot } from "@radix-ui/react-slot";
import {
  type ComponentProps,
  type ReactNode,
  useLayoutEffect,
  useRef,
} from "react";
import { cn } from "./lib/utils";

type InlineBounds = Pick<DOMRect, "left" | "right">;

function getActionRowReserve(
  side: "start" | "end",
  rowBounds: InlineBounds,
  actionsBounds: InlineBounds,
) {
  const reserve =
    side === "start"
      ? actionsBounds.right - rowBounds.left
      : rowBounds.right - actionsBounds.left;
  return Math.max(0, Math.ceil(reserve));
}

function ActionRow({
  asChild = false,
  className,
  ...props
}: ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      className={cn("relative min-w-0", className)}
      data-action-row=""
      {...props}
    />
  );
}

function ActionRowMain({
  asChild = false,
  className,
  ...props
}: ComponentProps<"button"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn("min-w-0", className)}
      data-action-row-main=""
      {...props}
    />
  );
}

function ActionRowLabel({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn("min-w-0", className)}
      data-action-row-label=""
      {...props}
    />
  );
}

function ActionRowActions({
  children,
  className,
  side,
  ...props
}: Omit<ComponentProps<"div">, "ref"> & {
  children: ReactNode;
  side: "start" | "end";
}) {
  const actionsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const actions = actionsRef.current;
    const row = actions?.closest<HTMLElement>("[data-action-row]");
    if (!actions || !row) return;

    const property = `--action-row-${side}-reserve`;
    const syncReserve = () => {
      const actionsBounds = actions.getBoundingClientRect();
      const rowBounds = row.getBoundingClientRect();
      const reserve = getActionRowReserve(side, rowBounds, actionsBounds);
      row.style.setProperty(property, `${reserve}px`);
    };

    syncReserve();
    const observer = new ResizeObserver(syncReserve);
    observer.observe(actions);
    observer.observe(row);
    return () => {
      observer.disconnect();
      row.style.removeProperty(property);
    };
  }, [side]);

  return (
    <div
      className={cn(
        "absolute inset-y-0 z-20 flex items-center transition-opacity duration-100 ease-[cubic-bezier(0.2,0,0,1)]",
        side === "start" ? "start-0" : "end-0",
        className,
      )}
      data-action-row-actions=""
      data-side={side}
      ref={actionsRef}
      {...props}
    >
      {children}
    </div>
  );
}

function ActionRowAction({
  asChild = false,
  className,
  ...props
}: ComponentProps<"button"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn("pointer-events-auto", className)}
      data-action-row-action=""
      {...props}
    />
  );
}

function ActionRowStatus({
  className,
  ...props
}: Omit<ComponentProps<"span">, "ref">) {
  const statusRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const status = statusRef.current;
    const row = status?.closest<HTMLElement>("[data-action-row]");
    if (!status || !row) return;

    const property = "--action-row-status-end-reserve";
    const syncReserve = () => {
      const reserve = getActionRowReserve(
        "end",
        row.getBoundingClientRect(),
        status.getBoundingClientRect(),
      );
      row.style.setProperty(property, `${reserve}px`);
    };

    syncReserve();
    const observer = new ResizeObserver(syncReserve);
    observer.observe(status);
    observer.observe(row);
    return () => {
      observer.disconnect();
      row.style.removeProperty(property);
    };
  }, []);

  return (
    <span
      className={cn("pointer-events-none", className)}
      data-action-row-status=""
      ref={statusRef}
      {...props}
    />
  );
}

export {
  ActionRow,
  ActionRowAction,
  ActionRowActions,
  ActionRowLabel,
  ActionRowMain,
  ActionRowStatus,
  getActionRowReserve,
};
