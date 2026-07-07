import { Skeleton } from "@baseblocks/ui/skeleton";

export function PublicSiteSkeleton() {
  const sidebarSkeletonWidths = ["50%", "70%", "90%", "50%"];

  return (
    <div className="flex min-h-dvh flex-col overflow-hidden bg-background">
      <header className="shrink-0 border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-64 shrink-0 border-r p-4 lg:block">
          <nav className="space-y-1">
            {sidebarSkeletonWidths.map((width) => (
              <div
                key={width}
                className="flex items-center gap-2 px-2 py-2 rounded-md"
              >
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4" style={{ width }} />
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 overflow-auto p-4 sm:p-8">
          <div className="mx-auto max-w-4xl min-w-0 space-y-6">
            <Skeleton className="h-8 w-56" />
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
        </main>
      </div>
    </div>
  );
}
