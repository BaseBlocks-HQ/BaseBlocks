import { Skeleton } from "@baseblocks/ui/skeleton";

export function EditorSkeleton() {
  const railItems = [
    "pages",
    "site",
    "customization",
    "navigation",
    "layouts",
    "blocks",
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex flex-1 flex-col">
        <div className="flex h-14 items-center justify-between border-b px-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden">
          <div className="absolute inset-y-0 left-3 flex items-center sm:left-4 lg:left-6">
            <div className="rounded-[32px] border bg-background/88 p-2 shadow-xl">
              <div className="flex flex-col gap-1">
                {railItems.map((item) => (
                  <Skeleton key={item} className="h-11 w-11 rounded-2xl" />
                ))}
                <div className="mx-1 my-2 h-px bg-border" />
                <Skeleton className="h-11 w-11 rounded-2xl" />
                <Skeleton className="h-11 w-11 rounded-2xl" />
              </div>
            </div>
          </div>

          <div className="h-full overflow-hidden p-4 pl-20 md:p-8 md:pl-24 lg:pl-28">
            <div className="mx-auto max-w-4xl space-y-6">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
