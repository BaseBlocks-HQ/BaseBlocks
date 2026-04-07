import { cn } from "@baseblocks/ui/lib/utils";
import {
  NestedCard,
  NestedCardPeek,
  NestedCardSurface,
  nestedCardPeekActionClass,
  nestedCardShellOuterRadiusClass,
} from "@baseblocks/ui/nested-card";
import { Skeleton } from "@baseblocks/ui/skeleton";

const dashboardSitesGridClassName =
  "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3";

function SiteCardSkeleton() {
  return (
    <NestedCard className="min-h-[13rem]">
      <NestedCardSurface className="min-h-0 flex-1 px-3 pb-3 pt-4">
        <div className="flex h-full min-h-0 flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
          </div>
          <div className="flex min-w-0 items-end gap-3">
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      </NestedCardSurface>
      <NestedCardPeek>
        <Skeleton className={cn("flex-1", nestedCardPeekActionClass)} />
        <Skeleton className={cn("flex-1", nestedCardPeekActionClass)} />
      </NestedCardPeek>
    </NestedCard>
  );
}

export function DashboardSkeleton() {
  const sidebarItems = ["overview", "team", "sites", "settings"];
  const cardPlaceholders = ["alpha", "beta", "gamma"];

  return (
    <div className="flex min-h-dvh bg-background">
      <div className="hidden w-64 border-r p-4 md:block">
        <div className="space-y-4">
          <Skeleton className="mb-6 h-8 w-32" />
          <div className="space-y-1">
            {sidebarItems.map((item) => (
              <div key={item} className="flex items-center gap-3 px-2 py-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center border-b px-4 md:hidden">
          <Skeleton className="h-8 w-8 rounded-md" />
        </header>

        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6">
          <div className="mx-auto w-full max-w-[64rem]">
            <div className="mb-6 sm:mb-8">
              <Skeleton className="h-7 w-32" />
            </div>
            <div className={dashboardSitesGridClassName}>
              <Skeleton
                className={cn(
                  "h-[13rem] w-full",
                  nestedCardShellOuterRadiusClass,
                )}
              />
              {cardPlaceholders.map((item) => (
                <SiteCardSkeleton key={item} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { SiteCardSkeleton };
