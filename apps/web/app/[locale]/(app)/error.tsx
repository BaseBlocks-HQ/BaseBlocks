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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground text-sm">
        {error.message || "An unexpected error occurred"}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Go back
        </Button>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
