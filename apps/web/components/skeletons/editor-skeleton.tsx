import { Skeleton } from "@baseblocks/ui/skeleton";

export function EditorSkeleton() {
  const sidebarSkeletonWidths = ["80%-a", "100%-b", "60%-c", "80%-d", "100%-e"];

  return (
    <div className="flex min-h-screen bg-background">
      <div className="w-64 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-5 w-28" />
          </div>
        </div>
        <div className="p-3 space-y-1">
          {sidebarSkeletonWidths.map((item) => (
            <div key={item} className="flex items-center gap-2 px-2 py-1.5">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4" style={{ width: item.split("-")[0] }} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="h-12 border-b flex items-center justify-between px-4">
          <Skeleton className="h-5 w-40" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        </div>

        <div className="flex-1 p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
