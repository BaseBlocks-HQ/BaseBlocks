"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { authClient } from "@/lib/auth/client";
import { getTeamDashboardPath } from "@/features/dashboard/routes";
import { useRouter } from "@/i18n/navigation";
import { generateSlug, SLUG_PATTERN } from "@baseblocks/domain";
import { MAX_OWNED_ORGANIZATIONS } from "@baseblocks/backend/organization-policy";
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@baseblocks/ui/dialog";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { Spinner } from "@baseblocks/ui/spinner";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { workspaceApi } from "@/lib/convex/workspace-api";

export function WorkspaceCreateDialog({
  compact = false,
  disabled,
  personalAllowed,
}: {
  compact?: boolean;
  disabled: boolean;
  personalAllowed: boolean;
}) {
  const t = useTranslations("settings.organizations");
  const onboarding = useTranslations("onboarding");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<"personal" | "work" | null>(null);
  const completeOnboarding = useMutation(
    workspaceApi.workspaceProfiles.completeOnboarding,
  );

  const createWorkspace = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!intent) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await authClient.organization.create({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        metadata: {
          baseblocks: {
            intent,
            source: intent === "personal" ? "lazyPersonal" : "onboarding",
          },
        },
      });
      if (result.error || !result.data) {
        throw result.error ?? new Error(t("createFailed"));
      }
      await completeOnboarding({
        organizationId: result.data.id,
        intent,
        source: intent === "personal" ? "lazyPersonal" : "onboarding",
      });
      await authClient.organization.setActive({
        organizationId: result.data.id,
      });
      toast.success(t("created", { name: result.data.name }));
      setOpen(false);
      setName("");
      setSlug("");
      setIntent(null);
      router.push(getTeamDashboardPath(result.data.slug));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("createFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          aria-label={t("create")}
          className={
            compact ? "size-7 px-0 sm:h-7 sm:w-auto sm:px-2.5" : undefined
          }
          disabled={disabled}
          size="compact"
          title={compact ? t("create") : undefined}
        >
          <HugeiconsIcon icon={Add01Icon} className="size-4" />
          <span className={compact ? "sr-only sm:not-sr-only" : undefined}>
            {t("create")}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-[1.25rem] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("createTitle")}</DialogTitle>
          <DialogDescription>
            {disabled
              ? t("limitReached", { limit: MAX_OWNED_ORGANIZATIONS })
              : t("createDescription")}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={createWorkspace}>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              {onboarding("intentLabel")}
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {(["personal", "work"] as const).map((option) => {
                const unavailable = option === "personal" && !personalAllowed;
                return (
                  <Button
                    aria-pressed={intent === option}
                    className="h-auto min-h-20 flex-col items-start whitespace-normal p-3 text-left"
                    disabled={unavailable}
                    key={option}
                    onClick={() => setIntent(option)}
                    type="button"
                    variant={intent === option ? "default" : "outline"}
                  >
                    <span className="font-medium">
                      {onboarding(`${option}Title`)}
                    </span>
                    <span className="text-xs opacity-75">
                      {unavailable
                        ? t("personalAlreadyExists")
                        : onboarding(`${option}Description`)}
                    </span>
                  </Button>
                );
              })}
            </div>
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="workspace-create-name">{t("name")}</Label>
            <Input
              autoFocus
              id="workspace-create-name"
              value={name}
              onChange={(event) => {
                const nextName = event.target.value;
                setName(nextName);
                setSlug(generateSlug(nextName));
              }}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workspace-create-slug">{t("slug")}</Label>
            <Input
              id="workspace-create-slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value.toLowerCase())}
              pattern={SLUG_PATTERN}
              required
            />
            <p className="text-xs text-muted-foreground">{t("slugHint")}</p>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button disabled={submitting || !intent} type="submit">
              {submitting ? <Spinner className="size-4" /> : null}
              {submitting ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
