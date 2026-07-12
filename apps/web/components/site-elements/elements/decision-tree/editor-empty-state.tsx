import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@baseblocks/ui/empty";
import { GitFork, MousePointerClick } from "lucide-react";

export function DecisionTreeEditorEmptyState({
  variant,
}: {
  variant: "options" | "selection";
}) {
  const isOptionsEmpty = variant === "options";
  const Icon = isOptionsEmpty ? GitFork : MousePointerClick;

  return (
    <Empty className="h-full min-h-0 gap-3 border-0 px-6 py-8 md:p-8">
      <EmptyHeader className="gap-1.5">
        <EmptyMedia className="mb-1 size-9 rounded-xl" variant="icon">
          <Icon className="size-4" />
        </EmptyMedia>
        <EmptyTitle className="text-sm font-medium">
          {isOptionsEmpty ? "No options yet" : "Open an option"}
        </EmptyTitle>
        <EmptyDescription className="max-w-60 text-xs leading-relaxed">
          {isOptionsEmpty
            ? "Add an option below to continue this path."
            : "Choose an option on the left to edit its title and details."}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
