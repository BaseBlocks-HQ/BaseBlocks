import { Skeleton } from "@/components/ui/skeleton";

export function EditorSkeleton() {
  return (
    <div className="flex min-h-screen">
      <div className="w-64 border-r p-4">
        <Skeleton className="h-8 w-full mb-4" />
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-6 w-full" />
      </div>
      <div className="flex-1 p-8">
        <Skeleton className="h-10 w-64 mb-8" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}
