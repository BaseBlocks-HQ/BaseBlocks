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
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center justify-between border-b px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="hidden h-5 w-32 min-[380px]:block" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md sm:w-20" />
            <Skeleton className="hidden h-8 w-24 rounded-md sm:block" />
          </div>
        </div>

        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div className="absolute inset-y-14 left-3 z-30 flex items-center sm:left-4 lg:left-6">
            <div className="rounded-[2rem] border bg-background/90 p-2 shadow-xl">
              <div className="flex flex-col gap-1">
                {railItems.map((item) => (
                  <Skeleton
                    key={item}
                    className="h-10 w-10 rounded-[1.35rem]"
                  />
                ))}
                <div className="mx-1 mt-2 h-px w-auto bg-border/80" />
                <Skeleton className="h-10 w-10 rounded-[1.35rem]" />
                <Skeleton className="h-10 w-10 rounded-[1.35rem]" />
              </div>
            </div>
          </div>

          <div className="h-full overflow-hidden p-4 pt-18 pl-20 md:p-8 md:pt-18 md:pl-24 lg:pl-28">
            <div className="mx-auto max-w-4xl min-w-0 space-y-6">
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
