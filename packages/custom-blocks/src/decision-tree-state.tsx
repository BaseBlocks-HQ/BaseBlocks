import {
  CheckmarkCircle02Icon,
  GitForkIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@baseblocks/ui/empty";

const stateCopy = {
  answers: {
    description: "With no answers, this step is the final result.",
    icon: GitForkIcon,
    title: "No answers",
  },
  preview: {
    description: "Add a starting step to see the visitor experience.",
    icon: ViewIcon,
    title: "Nothing to preview",
  },
  result: {
    description: "This is the end of this path.",
    icon: CheckmarkCircle02Icon,
    title: "Final result",
  },
  steps: {
    description: "Add a starting step to build this decision tree.",
    icon: GitForkIcon,
    title: "No starting steps",
  },
} as const;

export function DecisionTreeState({
  className = "h-full min-h-32",
  variant,
}: {
  className?: string;
  variant: keyof typeof stateCopy;
}) {
  const state = stateCopy[variant];
  const result = variant === "result";
  return (
    <Empty className={`${className} gap-3 p-4`}>
      <EmptyHeader>
        <EmptyMedia
          className={
            result
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground"
          }
          variant="icon"
        >
          <HugeiconsIcon aria-hidden className="size-5" icon={state.icon} />
        </EmptyMedia>
        <EmptyTitle>{state.title}</EmptyTitle>
        <EmptyDescription className="max-w-60 text-xs">
          {state.description}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
