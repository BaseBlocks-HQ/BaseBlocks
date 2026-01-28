import { Skeleton } from "@/components/ui/skeleton";

export function PublicSiteSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Skeleton className="h-8 w-48" />
        </div>
      </header>
      <div className="flex">
        <aside className="w-64 border-r min-h-[calc(100vh-56px)] p-4">
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-8 w-full" />
        </aside>
        <main className="flex-1 p-8">
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-10 w-64 mb-8" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </main>
      </div>
    </div>
  );
}
