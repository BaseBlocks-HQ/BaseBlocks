"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { Spinner } from "@/components/ui/spinner";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for error in URL params
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    if (errorParam) {
      setError(errorParam);
      return;
    }

    // The EntityAuthProvider handles the __ea_ticket exchange automatically
    // Once authenticated, redirect to dashboard
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Authentication failed: {error}</p>
          <a href="/login" className="text-primary hover:underline">
            Try again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Spinner className="mx-auto h-8 w-8" />
        <p className="mt-4 text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}
