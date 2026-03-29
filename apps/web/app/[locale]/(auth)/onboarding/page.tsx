"use client";

import { LanguageSwitcher } from "@/components/language-switcher";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth/client";
import { useTeams } from "@/lib/data/use-team";
import { SLUG_PATTERN, generateSlug } from "@/lib/validation";
import { InvitationInbox } from "@/modules/dashboard/components/invitation-inbox";
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
import { Separator } from "@baseblocks/ui/separator";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { redirect } from "next/navigation";
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

  // Watch for team availability (e.g. after accepting an invite)
  const teams = useTeams();

  if (teams && teams.length > 0) {
    redirect("/dashboard");
  }

  const handleTeamNameChange = (value: string) => {
    setTeamName(value);
    setSlug(generateSlug(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    if (!session?.user) {
      setError("Not authenticated");
      setIsSubmitting(false);
      return;
    }

    void authClient.organization
      .create({
        name: teamName,
        slug,
      })
      .then((orgResult) => {
        const organizationData = orgResult.data;
        const organizationId = organizationData
          ? organizationData.id
          : undefined;

        if (!organizationId) {
          setError("Failed to create organization");
          return;
        }

        return createTeam({
          name: teamName,
          slug,
          organizationId,
        }).then(() => {
          router.push("/dashboard");
        });
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
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("onboarding.title")}</CardTitle>
          <CardDescription>{t("onboarding.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Show pending invitations so invited users can accept without
              creating their own workspace first */}
          <div className="mb-4">
            <InvitationInbox fullWidth onboardingMode />
          </div>

          <Separator className="my-4" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("onboarding.orCreateOwn")}
            </p>

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
                  .{process.env.NEXT_PUBLIC_ROOT_DOMAIN || "baseblocks.dev"}
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
