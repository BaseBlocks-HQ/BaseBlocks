import { Skeleton } from "@baseblocks/ui/skeleton";

export function ContentSkeleton() {
  return (
    <div className="mx-auto min-w-0 w-full max-w-4xl space-y-6">
      <Skeleton className="h-8 w-48 sm:w-56" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <Skeleton className="h-40 w-full rounded-lg" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}
