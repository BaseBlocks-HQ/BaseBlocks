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
          <div className="absolute z-30 flex max-sm:inset-x-0 max-sm:bottom-[calc(1rem_+_env(safe-area-inset-bottom))] max-sm:justify-center sm:inset-y-14 sm:left-4 sm:items-center lg:left-6">
            <div className="rounded-[1.75rem] border bg-background/90 p-1.5 shadow-lg sm:rounded-[2rem] sm:p-2 sm:shadow-xl">
              <div className="flex items-center gap-0.5 sm:flex-col sm:gap-1">
                {railItems.map((item) => (
                  <Skeleton
                    key={item}
                    className="h-9 w-9 rounded-[1.15rem] sm:h-10 sm:w-10 sm:rounded-[1.35rem]"
                  />
                ))}
                <div className="mx-0.5 h-7 w-px self-center bg-border/80 sm:mx-1 sm:mt-2 sm:h-px sm:w-auto" />
                <Skeleton className="h-9 w-9 rounded-[1.15rem] sm:h-10 sm:w-10 sm:rounded-[1.35rem]" />
                <Skeleton className="h-9 w-9 rounded-[1.15rem] sm:h-10 sm:w-10 sm:rounded-[1.35rem]" />
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
