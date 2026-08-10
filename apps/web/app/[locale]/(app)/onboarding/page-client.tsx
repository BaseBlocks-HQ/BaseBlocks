"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { EarthIcon } from "@hugeicons/core-free-icons";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { authClient } from "@/lib/auth/client";
import { SLUG_PATTERN, generateSlug } from "@baseblocks/domain";
import { getTeamDashboardPath } from "@/features/dashboard/routes";
import { InvitationInbox } from "@/features/dashboard/invitation-inbox";
import type { Locale } from "@baseblocks/i18n";
import { Button } from "@baseblocks/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@baseblocks/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { Separator } from "@baseblocks/ui/separator";
import { Spinner } from "@baseblocks/ui/spinner";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useMutation } from "convex/react";
import { workspaceApi } from "@/lib/convex/workspace-api";

type WorkspaceIntent = "personal" | "work";

const languageNames: Record<Locale, string> = {
  fr: "Français",
  en: "English",
};

const languageFlags: Record<Locale, string> = {
  fr: "🇫🇷",
  en: "🇺🇸",
};

export function OnboardingPageClient({
  user,
}: {
  user: { name: string | null; email: string | null } | null;
}) {
  const router = useRouter();
  const [intent, setIntent] = useState<WorkspaceIntent | null>(null);
  const [teamName, setTeamName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const completeOnboarding = useMutation(
    workspaceApi.workspaceProfiles.completeOnboarding,
  );

  const selectIntent = (nextIntent: WorkspaceIntent) => {
    setIntent(nextIntent);
    if (teamName) return;
    const personalName = user?.name
      ? t("onboarding.personalDefaultName", { name: user.name })
      : t("onboarding.personalFallbackName");
    const nextName = nextIntent === "personal" ? personalName : "";
    setTeamName(nextName);
    setSlug(generateSlug(nextName));
  };

  const handleTeamNameChange = (value: string) => {
    setTeamName(value);
    setSlug(generateSlug(value));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!intent) return;
    setError("");
    setIsSubmitting(true);

    void authClient.organization
      .create({
        name: teamName,
        slug,
        metadata: { baseblocks: { intent, source: "onboarding" } },
      })
      .then(async (orgResult) => {
        if (!orgResult.data?.id) {
          setError(t("onboarding.createFailed"));
          return;
        }
        await completeOnboarding({
          organizationId: orgResult.data.id,
          intent,
          source: "onboarding",
        });
        await authClient.organization.setActive({
          organizationId: orgResult.data.id,
        });
        router.push(getTeamDashboardPath(slug));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t("common.error"));
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="text-muted-foreground hover:text-foreground"
              size="icon"
              title={t("language.select")}
              variant="ghost"
            >
              <HugeiconsIcon
                icon={EarthIcon}
                className="h-4 w-4"
                strokeWidth={1.75}
              />
              <span className="sr-only">{t("language.select")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {routing.locales.map((loc) => (
              <DropdownMenuItem
                key={loc}
                onClick={() => router.replace(pathname, { locale: loc })}
                className={locale === loc ? "bg-accent" : ""}
              >
                <span className="mr-2">{languageFlags[loc]}</span>
                {languageNames[loc]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("onboarding.title")}</CardTitle>
          <CardDescription>{t("onboarding.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <InvitationInbox fullWidth onboardingMode />
          </div>

          <Separator className="my-4" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("onboarding.orCreateOwn")}
            </p>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                {t("onboarding.intentLabel")}
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {(["personal", "work"] as const).map((option) => (
                  <Button
                    key={option}
                    aria-pressed={intent === option}
                    className="h-auto min-h-20 flex-col items-start whitespace-normal p-3 text-left"
                    onClick={() => selectIntent(option)}
                    type="button"
                    variant={intent === option ? "default" : "outline"}
                  >
                    <span className="font-medium">
                      {t(`onboarding.${option}Title`)}
                    </span>
                    <span className="text-xs opacity-80">
                      {t(`onboarding.${option}Description`)}
                    </span>
                  </Button>
                ))}
              </div>
            </fieldset>

            <div className="space-y-2">
              <Label htmlFor="teamName">{t("onboarding.workspaceName")}</Label>
              <Input
                id="teamName"
                placeholder={t("onboarding.teamNamePlaceholder")}
                value={teamName}
                onChange={(e) => handleTeamNameChange(e.target.value)}
                required
                disabled={!intent}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="slug"
                  placeholder="acme"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase())}
                  required
                  disabled={!intent}
                  pattern={SLUG_PATTERN}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  .{process.env.NEXT_PUBLIC_ROOT_DOMAIN || "baseblocks.dev"}
                </span>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !intent}
            >
              {isSubmitting ? (
                <>
                  <Spinner />
                  {t("onboarding.creating")}
                </>
              ) : (
                t("onboarding.createWorkspace")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
