"use client";

import { getAccessSessionCookieName } from "@/modules/public-site/access-session";
import type { Id } from "@baseblocks/backend";
import { api } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { AlertCircle, Loader2, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() ?? null;
  }
  return null;
}

function setCookie(name: string, value: string, days: number): void {
  if (typeof document === "undefined") return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${secure}`;
}

function removeCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

interface AccessGateProps {
  siteId: Id<"sites">;
  siteName: string;
  children: React.ReactNode;
}

export function AccessGate({ siteId, siteName, children }: AccessGateProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasOptimisticAccess, setHasOptimisticAccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const verifyAccessCode = useMutation(api.sharing.mutations.verifyAccessCode);
  const sessionCookieName = getAccessSessionCookieName(siteId);

  const storedToken =
    typeof document !== "undefined" ? getCookie(sessionCookieName) : null;

  const sessionResult = useQuery(
    api.sharing.queries.validateSession,
    storedToken ? { siteId, sessionToken: storedToken } : "skip",
  );

  const hasAccess =
    hasOptimisticAccess && sessionResult === undefined
      ? true
      : !storedToken
        ? false
        : sessionResult === undefined
          ? null
          : sessionResult.valid;

  useEffect(() => {
    if (storedToken && sessionResult !== undefined && !sessionResult.valid) {
      removeCookie(sessionCookieName);
    }
  }, [sessionCookieName, sessionResult, storedToken]);

  // Focus input when gate is shown
  useEffect(() => {
    if (hasAccess === false && inputRef.current) {
      inputRef.current.focus();
    }
  }, [hasAccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsVerifying(true);

    try {
      const result = await verifyAccessCode({
        siteId,
        code: code.toUpperCase(),
      });

      // Store session token in cookie
      setCookie(sessionCookieName, result.sessionToken, 7);

      setHasOptimisticAccess(true);
      setIsVerifying(false);
    } catch (err) {
      setError(
        err instanceof ConvexError
          ? (err.data as string)
          : "Invalid or expired access code",
      );
      setCode("");
      inputRef.current?.focus();
      setIsVerifying(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (value.length <= 6) {
      setCode(value);
      setError(null);
    }
  };

  // Show loading state while checking session
  if (hasAccess === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show children if access is granted
  if (hasAccess) {
    return <>{children}</>;
  }

  // Show access gate
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{siteName}</h1>
          <p className="text-muted-foreground">
            Enter the access code to view this site
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="access-code" className="sr-only">
              Access Code
            </Label>
            <Input
              ref={inputRef}
              id="access-code"
              type="text"
              placeholder="Enter code"
              value={code}
              onChange={handleCodeChange}
              className="text-center text-2xl font-mono tracking-[0.3em] h-14"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              disabled={isVerifying}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={code.length < 6 || isVerifying}
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Unlock"
            )}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground">
          Ask the site owner for the access code
        </p>
      </div>
    </div>
  );
}
