"use client";

import { Button } from "@baseblocks/ui/button";
import { useRouter } from "next/navigation";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground max-w-2xl text-sm whitespace-pre-wrap break-words">
        {error.message || "An unexpected error occurred"}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Go back
        </Button>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
