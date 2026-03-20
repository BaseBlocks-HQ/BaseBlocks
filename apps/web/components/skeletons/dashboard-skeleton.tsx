import { Card, CardContent, CardHeader } from "@baseblocks/ui/card";
import { Skeleton } from "@baseblocks/ui/skeleton";

function SiteCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-lg flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <Skeleton className="h-3 w-20 mt-2" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </CardContent>
    </Card>
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

        <div className="min-w-0 flex-1 p-4 sm:p-6">
          <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <Skeleton className="mb-2 h-7 w-32" />
              <Skeleton className="h-4 w-full max-w-56" />
            </div>
            <Skeleton className="h-9 w-full max-w-28 rounded-md sm:w-28" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cardPlaceholders.map((item) => (
              <SiteCardSkeleton key={item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export { SiteCardSkeleton };
