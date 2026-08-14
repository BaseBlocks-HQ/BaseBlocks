import {
  CheckmarkCircle02Icon,
  GitForkIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Empty, EmptyHeader, EmptyTitle } from "@baseblocks/ui/empty";

const stateCopy = {
  answers: {
    icon: GitForkIcon,
    title: "With no answers, this step is the final result.",
  },
  preview: {
    icon: ViewIcon,
    title: "Nothing to preview",
  },
  result: {
    icon: CheckmarkCircle02Icon,
    title: "Final result",
  },
  steps: {
    icon: GitForkIcon,
    title: "No starting step",
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
    <Empty className={`${className} p-4`}>
      <EmptyHeader className="gap-2.5">
        <HugeiconsIcon
          aria-hidden
          className={
            result
              ? "size-5 text-emerald-600 dark:text-emerald-400"
              : "size-5 text-muted-foreground"
          }
          icon={state.icon}
        />
        <EmptyTitle>{state.title}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  );
}
