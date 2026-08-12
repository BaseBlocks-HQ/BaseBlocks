import { Empty, EmptyHeader, EmptyTitle } from "@baseblocks/ui/empty";
import { Spinner } from "@baseblocks/ui/spinner";
import type { ReactNode } from "react";

export function EditorRevealBoundary({
  children,
  state,
}: {
  children?: ReactNode;
  state: "loading" | "missing" | "ready";
}) {
  if (state === "loading") {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-background">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  if (state === "missing") {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle className="font-normal text-muted-foreground">
            Site not found
          </EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return children;
}
