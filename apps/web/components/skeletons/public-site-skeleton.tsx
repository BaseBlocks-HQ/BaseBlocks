import { Skeleton } from "@baseblocks/ui/skeleton";

export function PublicSiteSkeleton() {
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar nav */}
        <aside className="w-64 border-r p-4">
          <nav className="space-y-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-2 py-2 rounded-md"
              >
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton
                  className="h-4"
                  style={{ width: `${50 + (i % 3) * 20}%` }}
                />
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 p-8 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6">
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
