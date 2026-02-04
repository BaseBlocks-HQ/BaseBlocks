"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Id } from "@repo/backend";
import { api } from "@repo/backend";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { Lock, AlertCircle, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const SESSION_COOKIE_NAME = "bb_access_session";

// Cookie helpers
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
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const verifyAccessCode = useMutation(api.sharing.mutations.verifyAccessCode);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      const sessionToken = getCookie(`${SESSION_COOKIE_NAME}_${siteId}`);
      if (sessionToken) {
        // Session exists, assume it's valid (the server will verify when fetching data)
        setHasAccess(true);
      } else {
        setHasAccess(false);
      }
    };

    checkExistingSession();
  }, [siteId]);

  // Focus input when gate is shown
  useEffect(() => {
    if (hasAccess === false && inputRef.current) {
      inputRef.current.focus();
    }
  }, [hasAccess]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsVerifying(true);

      try {
        const result = await verifyAccessCode({
          siteId,
          code: code.toUpperCase(),
        });

        // Store session token in cookie
        setCookie(`${SESSION_COOKIE_NAME}_${siteId}`, result.sessionToken, 7);

        setHasAccess(true);
      } catch (err) {
        setError(
          err instanceof ConvexError
            ? (err.data as string)
            : "Invalid or expired access code"
        );
        setCode("");
        inputRef.current?.focus();
      } finally {
        setIsVerifying(false);
      }
    },
    [siteId, code, verifyAccessCode]
  );

  const handleCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (value.length <= 6) {
        setCode(value);
        setError(null);
      }
    },
    []
  );

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

// Hook to get the session token for a site
export function useAccessSession(siteId: Id<"sites">): string | null {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const sessionToken = getCookie(`${SESSION_COOKIE_NAME}_${siteId}`);
    setToken(sessionToken ?? null);
  }, [siteId]);

  return token;
}

// Function to clear the session (for logout or expired sessions)
export function clearAccessSession(siteId: Id<"sites">) {
  removeCookie(`${SESSION_COOKIE_NAME}_${siteId}`);
}
