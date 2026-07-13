"use client";

import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@baseblocks/ui/button";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

type SocialProvider = "google" | "github" | "microsoft";

interface SignInWithProviderArgs {
  callbackURL: string;
  fallbackError: string;
  provider: SocialProvider;
}

async function signInWithProvider({
  callbackURL,
  fallbackError,
  provider,
}: SignInWithProviderArgs): Promise<string | null> {
  try {
    await authClient.signIn.social({ provider, callbackURL });
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : fallbackError;
  }
}

export function LoginPageClient() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/onboarding";

  return <LoginForm redirectTo={redirectTo} />;
}

function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [error, setError] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<SocialProvider | null>(
    null,
  );
  const t = useTranslations();

  const handleSocialSignIn = async (provider: SocialProvider) => {
    setError(null);
    setActiveProvider(provider);

    const errorMessage = await signInWithProvider({
      provider,
      callbackURL: redirectTo,
      fallbackError: t("auth.signInFailed"),
    });

    if (errorMessage) {
      setError(errorMessage);
      setActiveProvider(null);
    }
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <Image
              src="/brand/baseblocks-logo.png"
              alt=""
              width={600}
              height={600}
              priority
              sizes="24px"
              className="size-6 shrink-0 object-contain"
            />
            <span
              style={{ fontFamily: "var(--font-geist-pixel-square)" }}
              className="tracking-tight"
            >
              BaseBlocks
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-center gap-1 text-center">
                <h1 className="text-2xl font-bold">{t("auth.loginTitle")}</h1>
                <p className="text-sm text-balance text-muted-foreground">
                  {t("auth.loginDescription")}
                </p>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                variant="secondary"
                className="h-11 w-full rounded-full"
                onClick={() => handleSocialSignIn("github")}
                disabled={activeProvider !== null}
              >
                <svg
                  className="mr-2 h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 .5C5.649.5.5 5.649.5 12A11.5 11.5 0 0 0 8.36 22.93c.575.106.785-.25.785-.556 0-.274-.01-1-.015-1.963-3.197.695-3.873-1.54-3.873-1.54-.523-1.328-1.277-1.682-1.277-1.682-1.044-.714.079-.7.079-.7 1.154.08 1.761 1.185 1.761 1.185 1.026 1.758 2.694 1.25 3.35.956.104-.743.402-1.25.73-1.538-2.552-.29-5.236-1.276-5.236-5.68 0-1.255.448-2.282 1.182-3.086-.118-.29-.512-1.46.112-3.044 0 0 .964-.308 3.16 1.179A10.94 10.94 0 0 1 12 6.032c.973.005 1.953.132 2.868.388 2.194-1.487 3.157-1.18 3.157-1.18.626 1.585.232 2.755.114 3.045.736.804 1.18 1.83 1.18 3.086 0 4.415-2.688 5.387-5.248 5.67.413.355.78 1.058.78 2.132 0 1.539-.014 2.78-.014 3.158 0 .31.207.668.79.554A11.503 11.503 0 0 0 23.5 12C23.5 5.649 18.351.5 12 .5Z" />
                </svg>
                {activeProvider === "github"
                  ? t("common.redirecting")
                  : t("auth.continueWithGitHub")}
              </Button>

              <Button
                variant="secondary"
                className="h-11 w-full rounded-full"
                onClick={() => handleSocialSignIn("microsoft")}
                disabled={activeProvider !== null}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#f25022" d="M1 1h10v10H1z" />
                  <path fill="#00a4ef" d="M13 1h10v10H13z" />
                  <path fill="#7fba00" d="M1 13h10v10H1z" />
                  <path fill="#ffb900" d="M13 13h10v10H13z" />
                </svg>
                {activeProvider === "microsoft"
                  ? t("common.redirecting")
                  : t("auth.continueWithMicrosoft")}
              </Button>

              <Button
                variant="secondary"
                className="h-11 w-full rounded-full"
                onClick={() => handleSocialSignIn("google")}
                disabled={activeProvider !== null}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                {activeProvider === "google"
                  ? t("common.redirecting")
                  : t("auth.continueWithGoogle")}
              </Button>

              <Link
                href="/"
                className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                {t("common.backToHome")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="relative hidden bg-muted lg:block">
        <Image
          src="/login/baseblocks-login-art.png"
          alt="BaseBlocks artwork"
          fill
          priority
          sizes="50vw"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  );
}
