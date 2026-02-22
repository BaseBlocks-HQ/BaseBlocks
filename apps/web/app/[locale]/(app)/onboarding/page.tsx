"use client";

import { LanguageSwitcher } from "@/components/language-switcher";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth/client";
import { isVercelAppDomain } from "@/lib/url";
import { SLUG_PATTERN, generateSlug } from "@/lib/validation";
import { api } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@baseblocks/ui/card";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [teamName, setTeamName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const t = useTranslations();

  const createTeam = useMutation(api.teams.mutations.create);

  const handleTeamNameChange = (value: string) => {
    setTeamName(value);
    setSlug(generateSlug(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (!session?.user) {
        throw new Error("Not authenticated");
      }

      // Create Better Auth organization
      const orgResult = await authClient.organization.create({
        name: teamName,
        slug,
      });

      if (!orgResult.data?.id) {
        throw new Error("Failed to create organization");
      }

      // Create team in Convex with the BA organization ID
      await createTeam({
        name: teamName,
        slug,
        organizationId: orgResult.data.id,
      });

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("onboarding.title")}</CardTitle>
          <CardDescription>{t("onboarding.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">{t("onboarding.teamName")}</Label>
              <Input
                id="teamName"
                placeholder={t("onboarding.teamNamePlaceholder")}
                value={teamName}
                onChange={(e) => handleTeamNameChange(e.target.value)}
                required
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
                  pattern={SLUG_PATTERN}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {isVercelAppDomain()
                    ? `/s/${slug || "acme"}`
                    : `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || "baseblocks.dev"}`}
                </span>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting
                ? t("onboarding.creating")
                : t("onboarding.createWorkspace")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
